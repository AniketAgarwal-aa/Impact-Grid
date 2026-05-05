"""
ImpactSensei v5.0 - Companies Router (Admin only)
Multi-tenant company management
"""

import json
import re
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import require_admin
from ..models import Company, Project, User
from ..schemas import CompanyCreate, CompanyUpdate
from ..utils.audit import log_audit

router = APIRouter(prefix="/api/admin/companies", tags=["Companies"])
SUPER_ADMIN_EMAIL = "aniketagarwal359@gmail.com"


def slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug[:50]


@router.get("")
async def list_companies(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str = Query(""),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    query = db.query(Company)
    if search:
        query = query.filter(Company.name.ilike(f"%{search}%"))
    total = query.count()
    companies = (
        query.order_by(desc(Company.created_at))
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    result = []
    for c in companies:
        user_count = (
            db.query(func.count(User.id)).filter(User.company_id == c.id).scalar()
        )
        project_count = (
            db.query(func.count(Project.id)).filter(Project.company_id == c.id).scalar()
        )
        creator = db.query(User).filter(User.id == c.created_by).first()
        result.append(
            {
                "id": c.id,
                "name": c.name,
                "slug": c.slug,
                "logo_url": c.logo_url,
                "subscription_tier": c.subscription_tier,
                "max_projects": c.max_projects,
                "max_users": c.max_users,
                "is_active": c.is_active,
                "user_count": user_count,
                "project_count": project_count,
                "created_by_name": creator.full_name if creator else None,
                "created_at": c.created_at,
            }
        )
    return {
        "companies": result,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
    }


@router.get("/{company_id}")
async def get_company(
    company_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    c = db.query(Company).filter(Company.id == company_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Company not found")
    users = db.query(User).filter(User.company_id == c.id).all()
    projects = db.query(Project).filter(Project.company_id == c.id).all()
    return {
        "id": c.id,
        "name": c.name,
        "slug": c.slug,
        "logo_url": c.logo_url,
        "subscription_tier": c.subscription_tier,
        "max_projects": c.max_projects,
        "max_users": c.max_users,
        "max_storage_mb": c.max_storage_mb,
        "is_active": c.is_active,
        "created_at": c.created_at,
        "users": [
            {"id": u.id, "email": u.email, "full_name": u.full_name, "role": u.role}
            for u in users
        ],
        "projects": [
            {"id": p.id, "name": p.name, "status": p.status} for p in projects
        ],
    }


@router.post("")
async def create_company(
    data: CompanyCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    slug = data.slug or slugify(data.name)
    # Ensure unique slug
    existing = db.query(Company).filter(Company.slug == slug).first()
    if existing:
        slug = f"{slug}-{int(datetime.utcnow().timestamp())}"

    company = Company(
        name=data.name,
        slug=slug,
        subscription_tier=data.subscription_tier,
        max_projects=data.max_projects,
        max_users=data.max_users,
        is_active=True,
        created_by=current_user.id,
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    log_audit(
        db,
        current_user.id,
        "CREATE",
        "company",
        company.id,
        new_values={"name": data.name},
    )
    return {"id": company.id, "slug": slug, "message": "Company created successfully"}


@router.put("/{company_id}")
async def update_company(
    company_id: int,
    data: CompanyUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    c = db.query(Company).filter(Company.id == company_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Company not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(c, key, value)
    c.updated_at = datetime.utcnow()
    db.commit()
    log_audit(
        db,
        current_user.id,
        "UPDATE",
        "company",
        company_id,
        new_values=data.model_dump(exclude_unset=True),
    )
    return {"message": "Company updated"}


@router.delete("/{company_id}")
async def delete_company(
    company_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    c = db.query(Company).filter(Company.id == company_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Company not found")
    log_audit(
        db,
        current_user.id,
        "DELETE",
        "company",
        company_id,
        details=f"Deleted: {c.name}",
    )
    db.delete(c)
    db.commit()
    return {"message": "Company deleted"}


@router.post("/{company_id}/assign-pm")
async def assign_pm(
    company_id: int,
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Assign a user as PM of a company"""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if current_user.email != SUPER_ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Only super admin can change roles")
    if user.role == "admin":
        raise HTTPException(status_code=403, detail="Cannot change an admin into PM")
    user.company_id = company_id
    user.role = "project_manager"
    db.commit()
    log_audit(
        db,
        current_user.id,
        "UPDATE",
        "user",
        user_id,
        details=f"Assigned as PM of company {company_id}",
    )
    return {"message": f"{user.full_name} assigned as PM of {company.name}"}
