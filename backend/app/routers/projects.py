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
from ..models import (
    ChangeRequest,
    ImpactAnalysis,
    Project,
    ProjectAssignment,
    Requirement,
    User,
)
from ..schemas import ProjectCreate, ProjectMemberAdd, ProjectUpdate
from ..utils.audit import log_audit

router = APIRouter(prefix="/api/projects", tags=["Projects"])


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
    return {
        "id": p.id,
        "name": p.name,
        "description": p.description,
        "team_size": p.team_size,
        "cost_per_day": float(p.cost_per_day or 0),
        "initial_duration": p.initial_duration,
        "stage": p.stage,
        "currency": p.currency,
        "status": p.status,
        "priority": p.priority,
        "owner_id": p.owner_id,
        "owner_name": owner.full_name if owner else None,
        "company_id": p.company_id,
        "budget": float(p.budget) if p.budget else None,
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
        cost_per_day=data.cost_per_day,
        initial_duration=data.initial_duration,
        stage=data.stage,
        currency=data.currency,
        priority=data.priority,
        owner_id=current_user.id,
        start_date=data.start_date,
        end_date=data.end_date,
        budget=data.budget,
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
