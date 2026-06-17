"""
ImpactSensei v5.0 - Projects Router
Scoped by role: admin=all, PM=company, client=assigned
"""

import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user, require_pm_or_admin
from ..auth import generate_verification_token, hash_password
from ..models import (
    ChangeRequest,
    ImpactAnalysis,
    Project,
    ProjectAssignment,
    ProjectClient,
    Requirement,
    User,
)
from ..schemas import ProjectClientCreate, ProjectCreate, ProjectMemberAdd, ProjectUpdate
from ..utils.email import send_verification_email, _send
from ..utils.audit import log_audit

router = APIRouter(prefix="/api/projects", tags=["Projects"])


def _next_client_id(db: Session) -> str:
    last = (
        db.query(User)
        .filter(User.client_id.isnot(None))
        .order_by(User.id.desc())
        .first()
    )
    if last and last.client_id and last.client_id.startswith("CLT-"):
        try:
            num = int(last.client_id.split("-")[1]) + 1
        except ValueError:
            num = 1001
    else:
        num = 1001
    return f"CLT-{num}"


def _project_budget_fields(p):
    total_budget = float(p.budget or 0) or float(p.cost_per_day or 0) * max(1, p.initial_duration or 30)
    timeline_days = max(1, p.initial_duration or 30)
    return total_budget, timeline_days


def _project_list_entry(p, db, current_user_currency="INR"):
    req_count = (
        db.query(func.count(Requirement.id))
        .filter(Requirement.project_id == p.id)
        .scalar()
    )
    member_count = (
        db.query(func.count(ProjectAssignment.id))
        .filter(ProjectAssignment.project_id == p.id)
        .scalar()
    )
    owner = db.query(User).filter(User.id == p.owner_id).first()
    total_budget, timeline_days = _project_budget_fields(p)
    return {
        "id": p.id,
        "name": p.name,
        "description": p.description,
        "team_size": p.team_size,
        "total_budget": total_budget,
        "timeline_days": timeline_days,
        "cost_per_day": round(total_budget / timeline_days, 2),
        "initial_duration": timeline_days,
        "stage": p.stage,
        "currency": p.currency,
        "status": p.status,
        "priority": p.priority,
        "owner_id": p.owner_id,
        "owner_name": owner.full_name if owner else None,
        "company_id": p.company_id,
        "budget": total_budget,
        "start_date": str(p.start_date) if p.start_date else None,
        "end_date": str(p.end_date) if p.end_date else None,
        "requirements_count": req_count,
        "members_count": member_count,
        "created_at": p.created_at,
        "updated_at": p.updated_at,
    }


@router.get("")
async def list_projects(
    status: str = Query(""),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role == "admin":
        query = db.query(Project)
    elif current_user.role == "project_manager":
        query = db.query(Project).filter(Project.company_id == current_user.company_id)
    else:
        # client: only assigned projects
        assigned_ids = [
            a.project_id
            for a in db.query(ProjectAssignment)
            .filter(ProjectAssignment.user_id == current_user.id)
            .all()
        ]
        if not assigned_ids:
            return []
        query = db.query(Project).filter(Project.id.in_(assigned_ids))

    if status:
        query = query.filter(Project.status == status)
    projects = query.order_by(desc(Project.updated_at)).all()
    return [_project_list_entry(p, db) for p in projects]


@router.post("")
async def create_project(
    data: ProjectCreate,
    current_user: User = Depends(require_pm_or_admin),
    db: Session = Depends(get_db),
):
    project = Project(
        name=data.name,
        description=data.description,
        team_size=data.team_size,
        budget=data.total_budget,
        cost_per_day=round(data.total_budget / max(1, data.timeline_days), 2),
        initial_duration=data.timeline_days,
        stage=data.stage,
        currency=data.currency,
        priority=data.priority,
        owner_id=current_user.id,
        start_date=data.start_date,
        end_date=data.end_date,
        company_id=current_user.company_id,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    # Auto-assign owner as lead
    db.add(
        ProjectAssignment(
            project_id=project.id,
            user_id=current_user.id,
            role="lead",
            assigned_by=current_user.id,
        )
    )
    db.commit()
    log_audit(
        db,
        current_user.id,
        "CREATE",
        "project",
        project.id,
        new_values={"name": data.name},
    )
    return {"id": project.id, "message": "Project created"}


@router.get("/{project_id}")
async def get_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Access check
    if current_user.role == "client":
        assigned = (
            db.query(ProjectAssignment)
            .filter(
                ProjectAssignment.project_id == project_id,
                ProjectAssignment.user_id == current_user.id,
            )
            .first()
        )
        if not assigned:
            raise HTTPException(status_code=403, detail="Access denied")
    elif current_user.role == "project_manager":
        if project.company_id != current_user.company_id:
            raise HTTPException(status_code=403, detail="Access denied")

    requirements = (
        db.query(Requirement).filter(Requirement.project_id == project_id).all()
    )
    assignments = (
        db.query(ProjectAssignment)
        .filter(ProjectAssignment.project_id == project_id)
        .all()
    )
    owner = db.query(User).filter(User.id == project.owner_id).first()

    member_list = []
    for a in assignments:
        u = db.query(User).filter(User.id == a.user_id).first()
        if u:
            member_list.append(
                {
                    "id": a.id,
                    "user_id": u.id,
                    "email": u.email,
                    "full_name": u.full_name,
                    "client_id": u.client_id,
                    "role": a.role,
                    "joined_at": a.assigned_at,
                }
            )

    return {
        **_project_list_entry(project, db),
        "requirements": [
            {
                "id": r.id,
                "title": r.title,
                "description": r.description,
                "complexity": r.complexity,
                "priority": r.priority,
                "status": r.status,
                "category": r.category,
                "created_at": r.created_at,
            }
            for r in requirements
        ],
        "members": member_list,
    }


@router.put("/{project_id}")
async def update_project(
    project_id: int,
    data: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if current_user.role == "client":
        raise HTTPException(status_code=403, detail="Clients cannot update projects")
    if (
        current_user.role == "project_manager"
        and project.company_id != current_user.company_id
    ):
        raise HTTPException(status_code=403, detail="Access denied")
    for k, v in data.model_dump(exclude_unset=True).items():
        if k == "total_budget":
            project.budget = v
            project.cost_per_day = round(v / max(1, project.initial_duration or 1), 2)
        elif k == "timeline_days":
            project.initial_duration = v
            budget = float(project.budget or 0) or float(project.cost_per_day or 0) * max(1, v)
            project.cost_per_day = round(budget / max(1, v), 2)
        else:
            setattr(project, k, v)
    project.updated_at = datetime.utcnow()
    db.commit()
    log_audit(db, current_user.id, "UPDATE", "project", project_id)
    return {"message": "Project updated"}


@router.delete("/{project_id}")
async def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete projects")
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    log_audit(
        db, current_user.id, "DELETE", "project", project_id, details=project.name
    )
    db.delete(project)
    db.commit()
    return {"message": "Project deleted"}


@router.get("/{project_id}/members")
async def list_members(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    assignments = (
        db.query(ProjectAssignment)
        .filter(ProjectAssignment.project_id == project_id)
        .all()
    )
    result = []
    for a in assignments:
        u = db.query(User).filter(User.id == a.user_id).first()
        if u:
            result.append(
                {
                    "id": a.id,
                    "user_id": u.id,
                    "email": u.email,
                    "full_name": u.full_name,
                    "role": a.role,
                    "joined_at": a.assigned_at,
                }
            )
    return result


@router.post("/{project_id}/members")
async def add_member(
    project_id: int,
    data: ProjectMemberAdd,
    current_user: User = Depends(require_pm_or_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    existing = (
        db.query(ProjectAssignment)
        .filter(
            ProjectAssignment.project_id == project_id,
            ProjectAssignment.user_id == data.user_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="User already a member")
    db.add(
        ProjectAssignment(
            project_id=project_id,
            user_id=data.user_id,
            role=data.role,
            assigned_by=current_user.id,
        )
    )
    db.commit()
    log_audit(
        db,
        current_user.id,
        "CREATE",
        "project_assignment",
        project_id,
        details=f"Added {user.email}",
    )
    return {"message": "Member added"}


@router.delete("/{project_id}/members/{user_id}")
async def remove_member(
    project_id: int,
    user_id: int,
    current_user: User = Depends(require_pm_or_admin),
    db: Session = Depends(get_db),
):
    a = (
        db.query(ProjectAssignment)
        .filter(
            ProjectAssignment.project_id == project_id,
            ProjectAssignment.user_id == user_id,
        )
        .first()
    )
    if not a:
        raise HTTPException(status_code=404, detail="Member not found")
    db.delete(a)
    db.commit()
    return {"message": "Member removed"}


@router.post("/{project_id}/clients")
async def link_client(
    project_id: int,
    data: ProjectClientCreate,
    current_user: User = Depends(require_pm_or_admin),
    db: Session = Depends(get_db),
):
    """PM creates client account and links to project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    import secrets
    import string

    verification_token = generate_verification_token()
    user = db.query(User).filter(User.email == data.email).first()
    temp_password: str | None = None
    if not user:
        temp_password = "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))
        user = User(
            email=data.email,
            original_email=data.email,
            password_hash=hash_password(temp_password),
            full_name=data.full_name,
            role="client",
            company_id=current_user.company_id,
            client_id=_next_client_id(db),
            is_verified=False,
            is_active=True,
            force_password_change=True,
            email_verification_token=verification_token,
        )
        db.add(user)
        db.flush()
        send_verification_email(data.email, verification_token)
    elif user.role != "client":
        raise HTTPException(status_code=400, detail="Email belongs to a non-client user")
    elif not user.client_id:
        user.client_id = _next_client_id(db)

    existing = (
        db.query(ProjectClient)
        .filter(ProjectClient.project_id == project_id, ProjectClient.client_id == user.id)
        .first()
    )
    if not existing:
        db.add(
            ProjectClient(
                project_id=project_id,
                client_id=user.id,
                linked_by=current_user.id,
            )
        )
    existing_assign = (
        db.query(ProjectAssignment)
        .filter(ProjectAssignment.project_id == project_id, ProjectAssignment.user_id == user.id)
        .first()
    )
    if not existing_assign:
        db.add(
            ProjectAssignment(
                project_id=project_id,
                user_id=user.id,
                role="client",
                assigned_by=current_user.id,
            )
        )
    db.commit()

    body = (
        f"<h2>Your client account is ready</h2>"
        f"<p><strong>Client ID:</strong> {user.client_id}</p>"
        f"<p><strong>Project:</strong> {project.name}</p>"
    )
    if temp_password:
        body += f"<p><strong>Temporary password:</strong> {temp_password}</p>"
        body += "<p>Verify your email with the 6-digit OTP, then log in and change your password.</p>"
    else:
        body += "<p>You have been linked to this project. Log in to view it.</p>"
    _send(data.email, f"Welcome to {project.name} — Impact Grid", body)
    log_audit(db, current_user.id, "CREATE", "project_client", project_id, details=data.email)
    return {
        "message": "Client linked to project",
        "client_id": user.client_id,
        "user_id": user.id,
    }


@router.get("/{project_id}/analytics")
async def project_analytics(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    req_count = (
        db.query(func.count(Requirement.id))
        .filter(Requirement.project_id == project_id)
        .scalar()
    )
    req_ids = [
        r.id
        for r in db.query(Requirement.id)
        .filter(Requirement.project_id == project_id)
        .all()
    ]
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
    avg_risk = (
        sum(int(a.risk_score or 0) for a in analyses) / len(analyses) if analyses else 0
    )
    return {
        "requirements_count": req_count,
        "change_requests_count": len(crs),
        "analyses_count": len(analyses),
        "average_risk_score": round(avg_risk, 1),
        "change_requests_by_status": {
            s: sum(1 for c in crs if c.status == s) for s in set(c.status for c in crs)
        },
    }
