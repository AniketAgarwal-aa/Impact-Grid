"""
Project Management Router
Gantt charts, burndown, roadmap, SLA dashboard, satisfaction surveys.
"""

import json
from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user, require_pm_or_admin
from ..models import (
    ChangeRequest,
    ImpactAnalysis,
    Project,
    Requirement,
    SatisfactionSurvey,
    SlaConfig,
    Sprint,
    SprintTask,
    User,
)
from ..utils.audit import log_audit

router = APIRouter(prefix="/api", tags=["Project Management"])


# ── Gantt Chart ───────────────────────────────────────────────────────────────

@router.get("/gantt/{project_id}")
async def gantt_chart(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return Gantt-compatible task list for a project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(404, "Project not found")

    crs = (
        db.query(ChangeRequest)
        .join(Requirement, Requirement.id == ChangeRequest.requirement_id)
        .filter(Requirement.project_id == project_id)
        .order_by(ChangeRequest.created_at)
        .all()
    )

    tasks = []
    start_base = project.start_date or datetime.utcnow().date()

    for i, cr in enumerate(crs):
        # Derive estimated duration from latest analysis
        analysis = (
            db.query(ImpactAnalysis)
            .filter(ImpactAnalysis.change_request_id == cr.id)
            .order_by(ImpactAnalysis.created_at.desc())
            .first()
        )
        duration = int(analysis.time_increase or 7) if analysis else 7
        task_start = start_base + timedelta(days=i * 3)  # stagger for visibility
        task_end = task_start + timedelta(days=max(1, duration))

        req = db.query(Requirement).filter(Requirement.id == cr.requirement_id).first()

        tasks.append({
            "id": str(cr.id),
            "name": cr.description[:60] + ("..." if len(cr.description) > 60 else ""),
            "start": task_start.isoformat(),
            "end": task_end.isoformat(),
            "progress": (
                100 if cr.status == "approved"
                else 50 if cr.status in ("submitted", "under_review")
                else 0
            ),
            "status": cr.status,
            "priority": cr.priority,
            "complexity": cr.complexity,
            "requirement": req.title[:40] if req else "Unknown",
            "estimated_days": duration,
            "type": "task",
            "dependencies": [],
        })

    return {
        "project_id": project_id,
        "project_name": project.name,
        "start_date": start_base.isoformat(),
        "end_date": (project.end_date or (start_base + timedelta(days=90))).isoformat()
        if not project.end_date
        else project.end_date.isoformat(),
        "tasks": tasks,
        "total_tasks": len(tasks),
    }


# ── Burndown Chart ────────────────────────────────────────────────────────────

@router.get("/burndown/{sprint_id}")
async def burndown_chart(
    sprint_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Sprint burndown: ideal vs actual remaining effort."""
    sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
    if not sprint:
        raise HTTPException(404, "Sprint not found")

    tasks = db.query(SprintTask).filter(SprintTask.sprint_id == sprint_id).all()
    if not tasks:
        return {"sprint_id": sprint_id, "sprint_name": sprint.name, "data": []}

    total_hours = sum(t.estimated_hours or 8 for t in tasks)
    start = sprint.start_date or datetime.utcnow().date()
    end = sprint.end_date or (start + timedelta(days=14))
    total_days = max(1, (end - start).days)

    data = []
    for day_offset in range(total_days + 1):
        current_date = start + timedelta(days=day_offset)
        ideal_remaining = total_hours * (1 - day_offset / total_days)

        # Actual: count completed task hours up to this date
        completed = sum(
            t.estimated_hours or 8
            for t in tasks
            if t.status == "done"
        )
        # Distribute completion evenly if no per-task dates
        fraction_done = min(1.0, completed / max(total_hours, 1))
        actual_remaining = total_hours * (1 - fraction_done * (day_offset / total_days))

        data.append({
            "date": current_date.isoformat(),
            "day": day_offset,
            "ideal_remaining": round(ideal_remaining, 1),
            "actual_remaining": round(actual_remaining, 1),
        })

    done_count = sum(1 for t in tasks if t.status == "done")
    return {
        "sprint_id": sprint_id,
        "sprint_name": sprint.name,
        "total_hours": total_hours,
        "total_tasks": len(tasks),
        "done_tasks": done_count,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "data": data,
    }


# ── Roadmap ────────────────────────────────────────────────────────────────────

@router.get("/roadmap/{company_id}")
async def roadmap(
    company_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Quarterly roadmap for a company."""
    projects = (
        db.query(Project)
        .filter(Project.company_id == company_id)
        .order_by(Project.start_date)
        .all()
    )

    now = datetime.utcnow().date()
    quarters: dict[str, list[dict]] = {}

    for p in projects:
        start = p.start_date or now
        # Assign to quarter
        q_num = (start.month - 1) // 3 + 1
        q_key = f"Q{q_num} {start.year}"

        # Progress: approved CRs / total CRs
        reqs = db.query(Requirement).filter(Requirement.project_id == p.id).all()
        req_ids = [r.id for r in reqs]
        total_crs = (
            db.query(ChangeRequest)
            .filter(ChangeRequest.requirement_id.in_(req_ids))
            .count()
            if req_ids else 0
        )
        approved_crs = (
            db.query(ChangeRequest)
            .filter(
                ChangeRequest.requirement_id.in_(req_ids),
                ChangeRequest.status == "approved",
            )
            .count()
            if req_ids else 0
        )
        progress = round(approved_crs / max(total_crs, 1) * 100)

        quarters.setdefault(q_key, []).append({
            "project_id": p.id,
            "project_name": p.name,
            "status": p.status,
            "priority": p.priority,
            "start_date": start.isoformat(),
            "end_date": p.end_date.isoformat() if p.end_date else None,
            "progress": progress,
            "total_change_requests": total_crs,
            "approved_change_requests": approved_crs,
        })

    return {
        "company_id": company_id,
        "quarters": [
            {"quarter": k, "projects": v, "total_projects": len(v)}
            for k, v in quarters.items()
        ],
        "total_projects": len(projects),
    }


# ── SLA Dashboard ──────────────────────────────────────────────────────────────

@router.get("/sla/dashboard")
async def sla_dashboard(
    current_user: User = Depends(require_pm_or_admin),
    db: Session = Depends(get_db),
):
    """SLA monitoring: overdue approvals and configured SLAs."""
    now = datetime.utcnow()

    # Default SLA thresholds if not configured: low=72h, medium=48h, high=24h, critical=8h
    sla_defaults = {
        "low": 72,
        "medium": 48,
        "high": 24,
        "critical": 8,
    }

    # Get configured SLAs for admin's company (or all for admin)
    if current_user.company_id:
        sla_configs = (
            db.query(SlaConfig)
            .filter(SlaConfig.company_id == current_user.company_id)
            .all()
        )
        sla_map = {s.risk_level: s.max_approval_hours for s in sla_configs} or sla_defaults
    else:
        sla_map = sla_defaults

    # Pending change requests
    query = db.query(ChangeRequest).filter(
        ChangeRequest.status.in_(["submitted", "under_review"])
    )
    if current_user.role == "project_manager" and current_user.company_id:
        # Only show CRs from their company
        project_ids = [
            p.id for p in db.query(Project).filter(
                Project.company_id == current_user.company_id
            ).all()
        ]
        req_ids = [
            r.id for r in db.query(Requirement).filter(
                Requirement.project_id.in_(project_ids)
            ).all()
        ] if project_ids else []
        if req_ids:
            query = query.filter(ChangeRequest.requirement_id.in_(req_ids))

    pending_crs = query.all()

    overdue = []
    on_time = []

    for cr in pending_crs:
        submitted = cr.submitted_at or cr.created_at
        if not submitted:
            continue
        hours_elapsed = (now - submitted).total_seconds() / 3600

        # Determine risk level from latest analysis
        analysis = (
            db.query(ImpactAnalysis)
            .filter(ImpactAnalysis.change_request_id == cr.id)
            .order_by(ImpactAnalysis.created_at.desc())
            .first()
        )
        risk_level = (analysis.risk_level or "medium").lower() if analysis else "medium"
        sla_hours = sla_map.get(risk_level, 48)

        entry = {
            "cr_id": cr.id,
            "description": cr.description[:80],
            "priority": cr.priority,
            "status": cr.status,
            "risk_level": risk_level,
            "sla_hours": sla_hours,
            "hours_elapsed": round(hours_elapsed, 1),
            "hours_remaining": round(sla_hours - hours_elapsed, 1),
            "submitted_at": submitted.isoformat(),
            "overdue": hours_elapsed > sla_hours,
        }

        if hours_elapsed > sla_hours:
            overdue.append(entry)
        else:
            on_time.append(entry)

    return {
        "sla_configs": sla_map,
        "total_pending": len(pending_crs),
        "overdue_count": len(overdue),
        "on_time_count": len(on_time),
        "overdue": sorted(overdue, key=lambda x: x["hours_elapsed"], reverse=True),
        "on_time": sorted(on_time, key=lambda x: x["hours_remaining"]),
        "compliance_rate": round(
            len(on_time) / max(len(pending_crs), 1) * 100, 1
        ),
    }


# ── SLA Config CRUD ───────────────────────────────────────────────────────────

@router.get("/sla/config")
async def get_sla_configs(
    current_user: User = Depends(require_pm_or_admin),
    db: Session = Depends(get_db),
):
    company_id = current_user.company_id or 0
    configs = db.query(SlaConfig).filter(SlaConfig.company_id == company_id).all()
    return [
        {
            "id": c.id,
            "risk_level": c.risk_level,
            "max_approval_hours": c.max_approval_hours,
            "escalation_role": c.escalation_role,
        }
        for c in configs
    ]


@router.post("/sla/config")
async def create_sla_config(
    data: dict,
    current_user: User = Depends(require_pm_or_admin),
    db: Session = Depends(get_db),
):
    company_id = current_user.company_id or 0
    # Upsert
    existing = (
        db.query(SlaConfig)
        .filter(
            SlaConfig.company_id == company_id,
            SlaConfig.risk_level == data.get("risk_level"),
        )
        .first()
    )
    if existing:
        existing.max_approval_hours = data.get("max_approval_hours", 48)
        existing.escalation_role = data.get("escalation_role", "admin")
    else:
        config = SlaConfig(
            company_id=company_id,
            risk_level=data.get("risk_level", "medium"),
            max_approval_hours=data.get("max_approval_hours", 48),
            escalation_role=data.get("escalation_role", "admin"),
        )
        db.add(config)
    db.commit()
    return {"message": "SLA config saved"}


# ── Satisfaction Surveys ───────────────────────────────────────────────────────

@router.get("/satisfaction/{project_id}")
async def get_satisfaction_surveys(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    surveys = (
        db.query(SatisfactionSurvey)
        .filter(SatisfactionSurvey.project_id == project_id)
        .order_by(SatisfactionSurvey.created_at.desc())
        .all()
    )
    if not surveys:
        return {"surveys": [], "avg_rating": 0, "nps_score": 0, "total": 0}

    ratings = [s.rating for s in surveys]
    avg_rating = sum(ratings) / len(ratings)

    # NPS: promoters(5) - detractors(1,2)
    promoters = sum(1 for r in ratings if r >= 5)
    detractors = sum(1 for r in ratings if r <= 2)
    nps = round((promoters - detractors) / len(ratings) * 100)

    return {
        "surveys": [
            {
                "id": s.id,
                "rating": s.rating,
                "comment": s.comment,
                "change_request_id": s.change_request_id,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in surveys
        ],
        "avg_rating": round(avg_rating, 2),
        "nps_score": nps,
        "total": len(surveys),
        "distribution": {str(r): ratings.count(r) for r in range(1, 6)},
    }


@router.post("/satisfaction/{project_id}")
async def submit_satisfaction_survey(
    project_id: int,
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rating = data.get("rating")
    if not rating or rating not in range(1, 6):
        raise HTTPException(400, "Rating must be 1–5")

    survey = SatisfactionSurvey(
        project_id=project_id,
        change_request_id=data.get("change_request_id"),
        user_id=current_user.id,
        rating=rating,
        comment=data.get("comment"),
    )
    db.add(survey)
    db.commit()
    log_audit(db, current_user.id, "SUBMIT_SURVEY", "project", project_id)
    return {"message": "Survey submitted", "id": survey.id}
