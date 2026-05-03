"""Templates router"""

import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user, require_pm_or_admin
from ..models import Template, User
from ..schemas import TemplateApplyRequest, TemplateCreate, TemplateUpdate
from ..utils.audit import log_audit

router = APIRouter(prefix="/api/templates", tags=["Templates"])


@router.get("")
async def list_templates(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    q = db.query(Template)
    if current_user.role == "client":
        q = q.filter(
            (Template.is_public == True) | (Template.created_by == current_user.id)
        )
    elif current_user.role == "project_manager":
        q = q.filter(
            (Template.company_id == current_user.company_id)
            | (Template.is_public == True)
        )
    templates = q.all()
    return [
        {
            "id": t.id,
            "name": t.name,
            "description": t.description,
            "category": t.category,
            "is_public": t.is_public,
            "usage_count": t.usage_count,
            "created_at": t.created_at,
        }
        for t in templates
    ]


@router.post("")
async def create_template(
    data: TemplateCreate,
    current_user: User = Depends(require_pm_or_admin),
    db: Session = Depends(get_db),
):
    t = Template(
        name=data.name,
        description=data.description,
        category=data.category,
        content=json.dumps(data.content),
        is_public=data.is_public,
        variables=json.dumps(data.variables or []),
        company_id=current_user.company_id,
        created_by=current_user.id,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    log_audit(db, current_user.id, "CREATE", "template", t.id)
    return {"id": t.id, "message": "Template created"}


@router.put("/{template_id}")
async def update_template(
    template_id: int,
    data: TemplateUpdate,
    current_user: User = Depends(require_pm_or_admin),
    db: Session = Depends(get_db),
):
    t = db.query(Template).filter(Template.id == template_id).first()
    if not t:
        raise HTTPException(404, "Not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(t, k, json.dumps(v) if k == "content" else v)
    t.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Updated"}


@router.delete("/{template_id}")
async def delete_template(
    template_id: int,
    current_user: User = Depends(require_pm_or_admin),
    db: Session = Depends(get_db),
):
    t = db.query(Template).filter(Template.id == template_id).first()
    if not t:
        raise HTTPException(404, "Not found")
    db.delete(t)
    db.commit()
    return {"message": "Deleted"}


@router.post("/{template_id}/apply")
async def apply_template(
    template_id: int,
    data: TemplateApplyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    t = db.query(Template).filter(Template.id == template_id).first()
    if not t:
        raise HTTPException(404, "Not found")
    t.usage_count = (t.usage_count or 0) + 1
    db.commit()
    content = json.loads(t.content or "{}")
    if data.variables:
        for k, v in data.variables.items():
            content = {
                ck: cv.replace(f"{{{k}}}", v) if isinstance(cv, str) else cv
                for ck, cv in content.items()
            }
    return {"template_id": t.id, "applied_content": content}
