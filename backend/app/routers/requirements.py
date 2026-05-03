"""Requirements router"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user
from ..models import (
    Project,
    ProjectAssignment,
    Requirement,
    RequirementDependency,
    User,
)
from ..schemas import DependencyCreate, RequirementCreate, RequirementUpdate
from ..utils.audit import log_audit

router = APIRouter(prefix="/api/requirements", tags=["Requirements"])


def _check_project_access(project_id: int, user: User, db: Session):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(404, "Project not found")
    if user.role == "admin":
        return p
    if user.role == "project_manager":
        if p.company_id != user.company_id:
            raise HTTPException(403, "Access denied")
    else:
        a = (
            db.query(ProjectAssignment)
            .filter(
                ProjectAssignment.project_id == project_id,
                ProjectAssignment.user_id == user.id,
            )
            .first()
        )
        if not a:
            raise HTTPException(403, "Access denied")
    return p


@router.get("")
async def list_requirements(
    project_id: int = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Requirement)
    if project_id:
        _check_project_access(project_id, current_user, db)
        q = q.filter(Requirement.project_id == project_id)
    return [
        {
            "id": r.id,
            "project_id": r.project_id,
            "title": r.title,
            "description": r.description,
            "complexity": r.complexity,
            "priority": r.priority,
            "status": r.status,
            "category": r.category,
            "created_at": r.created_at,
        }
        for r in q.all()
    ]


@router.post("")
async def create_requirement(
    data: RequirementCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _check_project_access(data.project_id, current_user, db)
    r = Requirement(**data.model_dump(), created_by=current_user.id)
    db.add(r)
    db.commit()
    db.refresh(r)
    log_audit(db, current_user.id, "CREATE", "requirement", r.id)
    return {"id": r.id, "message": "Requirement created"}


@router.put("/{req_id}")
async def update_requirement(
    req_id: int,
    data: RequirementUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    r = db.query(Requirement).filter(Requirement.id == req_id).first()
    if not r:
        raise HTTPException(404, "Not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(r, k, v)
    r.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Updated"}


@router.delete("/{req_id}")
async def delete_requirement(
    req_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    r = db.query(Requirement).filter(Requirement.id == req_id).first()
    if not r:
        raise HTTPException(404, "Not found")
    db.delete(r)
    db.commit()
    log_audit(db, current_user.id, "DELETE", "requirement", req_id)
    return {"message": "Deleted"}


@router.post("/{req_id}/dependencies")
async def add_dependency(
    req_id: int,
    data: DependencyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    dep = RequirementDependency(
        requirement_id=req_id,
        depends_on_id=data.depends_on_id,
        dependency_type=data.dependency_type,
    )
    db.add(dep)
    db.commit()
    return {"message": "Dependency added"}
