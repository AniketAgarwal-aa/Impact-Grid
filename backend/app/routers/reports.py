"""Reports router"""

import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user, require_pm_or_admin
from ..models import (
    ChangeRequest,
    ImpactAnalysis,
    Project,
    ProjectAssignment,
    Requirement,
    User,
)

router = APIRouter(prefix="/api/reports", tags=["Reports"])


@router.get("/project/{project_id}")
async def project_report(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(404, "Project not found")
    reqs = db.query(Requirement).filter(Requirement.project_id == project_id).all()
    req_ids = [r.id for r in reqs]
    crs = (
        db.query(ChangeRequest).filter(ChangeRequest.requirement_id.in_(req_ids)).all()
        if req_ids
        else []
    )
    cr_ids = [c.id for c in crs]
    analyses = (
        db.query(ImpactAnalysis)
        .filter(ImpactAnalysis.change_request_id.in_(cr_ids))
        .all()
        if cr_ids
        else []
    )
    total_cost = sum(float(a.cost_increase or 0) for a in analyses)
    total_time = sum(int(a.time_increase or 0) for a in analyses)
    avg_risk = (
        sum(int(a.risk_score or 0) for a in analyses) / len(analyses) if analyses else 0
    )
    members = (
        db.query(ProjectAssignment)
        .filter(ProjectAssignment.project_id == project_id)
        .count()
    )
    return {
        "project": {
            "id": p.id,
            "name": p.name,
            "status": p.status,
            "stage": p.stage,
            "currency": p.currency,
            "team_size": p.team_size,
            "cost_per_day": float(p.cost_per_day or 0),
            "initial_duration": p.initial_duration,
        },
        "summary": {
            "total_requirements": len(reqs),
            "total_change_requests": len(crs),
            "total_analyses": len(analyses),
            "average_risk_score": round(avg_risk, 1),
            "total_cost_increase": round(total_cost, 2),
            "total_time_increase_days": total_time,
            "members_count": members,
            "change_requests_by_status": {
                s: sum(1 for c in crs if c.status == s)
                for s in set(c.status for c in crs)
            },
        },
    }


@router.get("/team")
async def team_report(
    current_user: User = Depends(require_pm_or_admin), db: Session = Depends(get_db)
):
    q = db.query(Project)
    if current_user.role == "project_manager":
        q = q.filter(Project.company_id == current_user.company_id)
    projects = q.all()
    total_crs = sum(
        db.query(func.count(ChangeRequest.id))
        .join(Requirement, Requirement.id == ChangeRequest.requirement_id)
        .filter(Requirement.project_id == p.id)
        .scalar()
        or 0
        for p in projects
    )
    pending = (
        db.query(func.count(ChangeRequest.id))
        .filter(ChangeRequest.status == "submitted")
        .scalar()
    )
    approved = (
        db.query(func.count(ChangeRequest.id))
        .filter(ChangeRequest.status == "approved")
        .scalar()
    )
    return {
        "total_projects": len(projects),
        "total_change_requests": total_crs,
        "pending_approvals": pending,
        "approved": approved,
    }


@router.get("/analysis/{analysis_id}")
async def analysis_report(
    analysis_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    a = db.query(ImpactAnalysis).filter(ImpactAnalysis.id == analysis_id).first()
    if not a:
        raise HTTPException(404, "Not found")
    return {
        "id": a.id,
        "change_size": a.change_size,
        "confidence_score": a.confidence_score,
        "cost_breakdown": {
            "labor": float(a.cost_labor or 0),
            "infrastructure": float(a.cost_infrastructure or 0),
            "third_party": float(a.cost_third_party or 0),
            "contingency": float(a.cost_contingency or 0),
            "training": float(a.cost_training or 0),
            "documentation": float(a.cost_documentation or 0),
        },
        "time_breakdown": {
            "development": a.time_development,
            "testing": a.time_testing,
            "deployment": a.time_deployment,
            "review": a.time_review,
            "documentation": a.time_documentation,
        },
        "effort_breakdown": {
            "senior": a.effort_senior,
            "mid": a.effort_mid,
            "junior": a.effort_junior,
        },
        "risk_breakdown": {
            "schedule": a.risk_schedule,
            "budget": a.risk_budget,
            "quality": a.risk_quality,
            "security": a.risk_security,
            "technical": a.risk_technical,
        },
        "recommendations": json.loads(a.recommendations or "[]"),
        "affected_components": json.loads(a.affected_components or "[]"),
    }
