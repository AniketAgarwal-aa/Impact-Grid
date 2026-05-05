"""
ImpactSensei v5.0 - FastAPI Dependencies
Role: admin | project_manager | client
"""

import json

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .auth import decode_token
from .database import get_db
from .models import SystemSetting, User

bearer = HTTPBearer(auto_error=False)


def _is_tfa_enabled(user: User) -> bool:
    try:
        prefs = json.loads(user.preferences or "{}")
        return bool((prefs.get("tfa") or {}).get("enabled"))
    except Exception:
        return False


def _resolve_user_from_token(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> tuple[User, dict]:
    exc = HTTPException(
        status_code=401,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not credentials:
        raise exc
    payload = decode_token(credentials.credentials)
    if not payload:
        raise exc
    user_id = payload.get("sub")
    if not user_id:
        raise exc
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User inactive or not found")
    return user, payload


def get_current_user_allow_pending_2fa(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    user, _ = _resolve_user_from_token(credentials, db)
    return user


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    user, payload = _resolve_user_from_token(credentials, db)
    # If email verification is enabled, block unverified users for ALL protected endpoints.
    setting = (
        db.query(SystemSetting)
        .filter(SystemSetting.key == "auth.require_email_verification")
        .first()
    )
    require_verify = setting.value.lower() == "true" if setting and setting.value else False
    if require_verify and not user.is_verified:
        raise HTTPException(status_code=403, detail="Email verification required")
    if _is_tfa_enabled(user) and payload.get("tfa_verified") is not True:
        raise HTTPException(status_code=401, detail="2FA verification required")
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def require_pm_or_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in ("project_manager", "admin"):
        raise HTTPException(
            status_code=403, detail="Project Manager or Admin access required"
        )
    return current_user


def require_verified(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_verified:
        raise HTTPException(status_code=403, detail="Email verification required")
    return current_user
