"""
Impact Grid - Admin Router
User mgmt + Company mgmt + Analytics + Audit + Settings
"""

import json
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from ..auth import generate_verification_token, hash_password
from ..database import get_db
from ..dependencies import require_admin
from ..models import (
    AuditLog,
    ChangeRequest,
    Company,
    ImpactAnalysis,
    Project,
    SystemSetting,
    User,
)
from ..constants import is_protected_admin, is_super_admin
from ..schemas import AdminUserCreate, AdminUserUpdate, RoleUpdate, SettingUpdate
from ..utils.audit import log_audit
from ..utils.email import send_verification_email

router = APIRouter(prefix="/api/admin", tags=["Admin"])


def _assert_can_modify_role(actor: User, target: User, new_role: str | None = None) -> None:
    """Super admin accounts cannot be modified or downgraded by anyone."""
    if is_protected_admin(target.email):
        raise HTTPException(
            status_code=403,
            detail="Super admin accounts cannot be modified or downgraded.",
        )

@router.patch("/users/{user_id}/verify")
async def verify_user(
    user_id: int,
    role: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Admin verifies a user and assigns their role."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_verified = True
    user.role = role
    user.last_login = datetime.utcnow()
    db.commit()
    
    log_audit(
        db,
        current_user.id,
        "VERIFY_USER",
        "user",
        user_id,
        details=f"Admin verified user {user.email} and assigned role: {role}",
    )
    
    return {"message": f"User verified and assigned role: {role}"}


@router.get("/users")
async def list_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str = Query(""),
    role: str = Query(""),
    company_id: int = Query(None),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    query = db.query(User)
    if search:
        query = query.filter(
            (User.full_name.ilike(f"%{search}%")) | (User.email.ilike(f"%{search}%"))
        )
    if role:
        query = query.filter(User.role == role)
    if company_id:
        query = query.filter(User.company_id == company_id)
    total = query.count()
    users = (
        query.order_by(desc(User.created_at))
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return {
        "users": [
            {
                "id": u.id,
                "email": u.email,
                "full_name": u.full_name,
                "role": u.role,
                "company_id": u.company_id,
                "department": u.department,
                "designation": u.designation,
                "is_active": u.is_active,
                "is_verified": u.is_verified,
                "client_id": u.client_id,
                "last_login": u.last_login,
                "created_at": u.created_at,
            }
            for u in users
        ],
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
    }


@router.post("/users")
async def create_user(
    data: AdminUserCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    if data.role == "admin" and is_protected_admin(data.email):
        raise HTTPException(status_code=400, detail="Cannot create super admin accounts")
    verification_token = generate_verification_token()
    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        role=data.role,
        company_id=data.company_id,
        department=data.department,
        designation=data.designation,
        # Always require email verification for new accounts (admin/pm/client).
        is_verified=False,
        email_verification_token=verification_token,
        is_active=True,
        force_password_change=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    log_audit(
        db,
        current_user.id,
        "CREATE",
        "user",
        user.id,
        new_values={"email": data.email, "role": data.role},
    )
    send_verification_email(data.email, verification_token)
    return {
        "id": user.id,
        "message": "User created. Verification code sent to email.",
    }


@router.put("/users/{user_id}")
async def update_user(
    user_id: int,
    data: AdminUserUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    incoming = data.model_dump(exclude_unset=True)

    if "role" in incoming:
        _assert_can_modify_role(current_user, user, incoming.get("role"))
    old = {"role": user.role, "is_active": user.is_active}
    for k, v in incoming.items():
        setattr(user, k, v)
    user.updated_at = datetime.utcnow()
    db.commit()
    log_audit(
        db,
        current_user.id,
        "UPDATE",
        "user",
        user_id,
        old_values=old,
        new_values=incoming,
    )
    return {"message": "User updated"}


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete own account")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    log_audit(
        db, current_user.id, "DELETE", "user", user_id, details=f"Deleted: {user.email}"
    )
    db.delete(user)
    db.commit()
    return {"message": "User deleted"}


@router.put("/users/{user_id}/role")
async def update_role(
    user_id: int,
    data: RoleUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    valid_roles = ["client", "project_manager", "admin"]
    if data.role not in valid_roles:
        raise HTTPException(
            status_code=400, detail=f"Role must be one of: {valid_roles}"
        )
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    _assert_can_modify_role(current_user, user, data.role)
    old_role = user.role
    user.role = data.role
    user.updated_at = datetime.utcnow()
    db.commit()
    log_audit(
        db,
        current_user.id,
        "UPDATE",
        "user",
        user_id,
        old_values={"role": old_role},
        new_values={"role": data.role},
    )
    return {"message": f"Role updated to {data.role}"}


@router.get("/analytics/overview")
async def analytics_overview(
    current_user: User = Depends(require_admin), db: Session = Depends(get_db)
):
    total_users = db.query(func.count(User.id)).scalar()
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar()
    total_companies = db.query(func.count(Company.id)).scalar()
    total_projects = db.query(func.count(Project.id)).scalar()
    active_projects = (
        db.query(func.count(Project.id)).filter(Project.status == "active").scalar()
    )
    total_analyses = db.query(func.count(ImpactAnalysis.id)).scalar()
    total_crs = db.query(func.count(ChangeRequest.id)).scalar()
    pending = (
        db.query(func.count(ChangeRequest.id))
        .filter(ChangeRequest.status.in_(["submitted", "under_review"]))
        .scalar()
    )
    recent = (
        db.query(func.count(User.id))
        .filter(User.created_at >= datetime.utcnow() - timedelta(days=30))
        .scalar()
    )
    roles = db.query(User.role, func.count(User.id)).group_by(User.role).all()

    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_companies": total_companies,
        "total_projects": total_projects,
        "active_projects": active_projects,
        "total_analyses": total_analyses,
        "total_change_requests": total_crs,
        "pending_requests": pending,
        "recent_signups": recent,
        "users_by_role": {r[0]: r[1] for r in roles},
    }


@router.get("/analytics/users")
async def analytics_users(
    period: str = "month",
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    days = {"week": 7, "month": 30, "year": 365}.get(period, 30)
    start = datetime.utcnow() - timedelta(days=days)
    return {
        "period": period,
        "new_users": db.query(func.count(User.id))
        .filter(User.created_at >= start)
        .scalar(),
        "active_logins": db.query(func.count(User.id))
        .filter(User.last_login >= start)
        .scalar(),
    }


@router.get("/analytics/projects")
async def analytics_projects(
    current_user: User = Depends(require_admin), db: Session = Depends(get_db)
):
    statuses = (
        db.query(Project.status, func.count(Project.id)).group_by(Project.status).all()
    )
    stages = (
        db.query(Project.stage, func.count(Project.id)).group_by(Project.stage).all()
    )
    return {
        "by_status": {s[0]: s[1] for s in statuses},
        "by_stage": {s[0]: s[1] for s in stages},
    }


@router.get("/audit-logs")
async def list_audit_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    action: str = Query(""),
    entity_type: str = Query(""),
    user_id: int = Query(None),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    total = query.count()
    logs = (
        query.order_by(desc(AuditLog.created_at))
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    result = []
    for log in logs:
        u = (
            db.query(User).filter(User.id == log.user_id).first()
            if log.user_id
            else None
        )
        result.append(
            {
                "id": log.id,
                "user_id": log.user_id,
                "user_name": u.full_name if u else "System",
                "user_email": u.email if u else None,
                "action": log.action,
                "entity_type": log.entity_type,
                "entity_id": log.entity_id,
                "ip_address": log.ip_address,
                "details": log.details,
                "created_at": log.created_at,
            }
        )
    return {
        "logs": result,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
    }


@router.get("/settings")
async def get_settings(
    current_user: User = Depends(require_admin), db: Session = Depends(get_db)
):
    settings = db.query(SystemSetting).order_by(SystemSetting.category).all()
    return [
        {
            "id": s.id,
            "key": s.key,
            "value": s.value,
            "type": s.type,
            "description": s.description,
            "category": s.category,
        }
        for s in settings
    ]


@router.put("/settings/{key}")
async def update_setting(
    key: str,
    data: SettingUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    s = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if not s:
        raise HTTPException(status_code=404, detail="Setting not found")
    old = s.value
    s.value = data.value
    s.updated_by = current_user.id
    s.updated_at = datetime.utcnow()
    db.commit()
    log_audit(
        db,
        current_user.id,
        "UPDATE",
        "system_setting",
        s.id,
        old_values={"value": old},
        new_values={"value": data.value},
    )
    return {"message": f"Setting '{key}' updated"}


# ── IP Whitelisting ──────────────────────────────────────────────────────────

@router.get("/ip-whitelist")
async def get_ip_whitelist(
    current_user: User = Depends(require_admin), db: Session = Depends(get_db)
):
    setting = db.query(SystemSetting).filter(SystemSetting.key == "security.ip_whitelist").first()
    if not setting or not setting.value:
        return []
    try:
        return json.loads(setting.value)
    except:
        return []


@router.post("/ip-whitelist")
async def add_ip_whitelist(
    data: dict, current_user: User = Depends(require_admin), db: Session = Depends(get_db)
):
    ip_range = data.get("ip_range")
    description = data.get("description", "")
    if not ip_range:
        raise HTTPException(400, "ip_range is required")
        
    setting = db.query(SystemSetting).filter(SystemSetting.key == "security.ip_whitelist").first()
    if not setting:
        setting = SystemSetting(key="security.ip_whitelist", value="[]", category="security")
        db.add(setting)
        
    try:
        whitelist = json.loads(setting.value or "[]")
    except:
        whitelist = []
        
    # Check if exists
    if any(item.get("ip_range") == ip_range for item in whitelist):
        raise HTTPException(400, "IP range already exists")
        
    new_entry = {
        "id": len(whitelist) + 1,
        "ip_range": ip_range,
        "description": description,
        "added_by": current_user.email,
        "added_at": datetime.utcnow().isoformat()
    }
    
    whitelist.append(new_entry)
    setting.value = json.dumps(whitelist)
    db.commit()
    
    log_audit(db, current_user.id, "UPDATE", "security", None, details=f"Added IP to whitelist: {ip_range}")
    return new_entry


@router.delete("/ip-whitelist/{id}")
async def remove_ip_whitelist(
    id: int, current_user: User = Depends(require_admin), db: Session = Depends(get_db)
):
    setting = db.query(SystemSetting).filter(SystemSetting.key == "security.ip_whitelist").first()
    if not setting or not setting.value:
        raise HTTPException(404, "Not found")
        
    try:
        whitelist = json.loads(setting.value)
    except:
        whitelist = []
        
    filtered = [item for item in whitelist if item.get("id") != id]
    if len(filtered) == len(whitelist):
        raise HTTPException(404, "Not found")
        
    setting.value = json.dumps(filtered)
    db.commit()
    
    log_audit(db, current_user.id, "UPDATE", "security", None, details=f"Removed IP from whitelist")
    return {"message": "IP removed from whitelist"}


# ── Encryption Status ────────────────────────────────────────────────────────

@router.get("/encryption/status")
async def get_encryption_status(
    current_user: User = Depends(require_admin), db: Session = Depends(get_db)
):
    import os
    key = os.getenv("ENCRYPTION_KEY")
    return {
        "enabled": True,
        "algorithm": "AES-256 (Fernet)",
        "key_configured": bool(key),
        "key_source": "environment" if key else "generated (development)",
    }

@router.post("/encryption/rotate-key")
async def rotate_encryption_key(
    current_user: User = Depends(require_admin), db: Session = Depends(get_db)
):
    from cryptography.fernet import Fernet
    from ..utils.encryption import rotate_key
    
    new_key = Fernet.generate_key().decode()
    rotate_key(new_key)
    log_audit(db, current_user.id, "UPDATE", "security", None, details="Rotated encryption key")
    
    return {
        "message": "Key rotated successfully. Update your ENCRYPTION_KEY environment variable.",
        "new_key": new_key
    }
