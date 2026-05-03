"""
ImpactSensei v5.0 - Auth Router
Registration defaults to role='client'
"""

from datetime import datetime, timedelta
import json
import time

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from ..auth import (
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_reset_token,
    generate_verification_token,
    hash_password,
    verify_password,
)
from ..database import get_db
from ..dependencies import get_current_user
from ..real_ip import get_client_ip
from ..models import User, UserSession
from ..schemas import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    RefreshTokenRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    UserLogin,
    UserProfileUpdate,
    UserRegister,
    VerifyEmailRequest,
)
from ..utils.audit import log_audit
from ..utils.email import (
    send_password_reset_email,
    send_verification_email,
    send_welcome_email,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

MAX_LOGIN_ATTEMPTS = 5
LOGIN_WINDOW_SECONDS = 15 * 60
_login_attempt_cache: dict[str, list[float]] = {}


@router.post("/register")
async def register(data: UserRegister, request: Request, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    verification_token = generate_verification_token()

    # Check if email verification is required
    from ..models import SystemSetting

    setting = (
        db.query(SystemSetting)
        .filter(SystemSetting.key == "auth.require_email_verification")
        .first()
    )
    require_verify = setting.value.lower() == "true" if setting else False

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        department=data.department,
        designation=data.designation,
        email_verification_token=verification_token,
        is_verified=not require_verify,  # Auto-verify if not required
        role="client",  # v5.0: default is client
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    if require_verify:
        send_verification_email(data.email, verification_token)

    log_audit(
        db, user.id, "REGISTER", "user", user.id, details=f"New client: {data.email}"
    )

    return {
        "message": "Registration successful."
        + (" Please verify your email." if require_verify else " You can now login."),
        "user_id": user.id,
        "email": user.email,
        "verification_required": require_verify,
    }


from pydantic import BaseModel

class LoginRequest(BaseModel):
    email: str
    password: str
    remember_me: bool = False

@router.options("/login")
async def options_login(request: Request):
    origin = request.headers.get("origin", "https://impact-sensei.vercel.app")
    response = JSONResponse(content={})
    response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response

@router.post("/login")
async def login(data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    client_ip = get_client_ip(request)
    attempt_key = f"{client_ip}:{data.email.lower()}"
    now = time.time()
    recent_attempts = [
        ts for ts in _login_attempt_cache.get(attempt_key, []) if (now - ts) < LOGIN_WINDOW_SECONDS
    ]
    _login_attempt_cache[attempt_key] = recent_attempts
    if len(recent_attempts) >= MAX_LOGIN_ATTEMPTS:
        retry_after = int(LOGIN_WINDOW_SECONDS - (now - recent_attempts[0]))
        raise HTTPException(
            status_code=429,
            detail=f"Too many login attempts. Try again in {max(retry_after, 1)} seconds.",
        )

    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.password_hash):
        recent_attempts.append(now)
        _login_attempt_cache[attempt_key] = recent_attempts
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Account is deactivated. Contact your administrator.",
        )
    if not user.is_verified:
        raise HTTPException(
            status_code=403, detail="Email not verified. Please check your inbox."
        )

    try:
        prefs = json.loads(user.preferences or "{}")
        tfa_enabled = bool((prefs.get("tfa") or {}).get("enabled"))
    except Exception:
        tfa_enabled = False

    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "tfa_verified": not tfa_enabled,
    }
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    user.last_login = datetime.utcnow()
    db.commit()
    _login_attempt_cache.pop(attempt_key, None)

    ip = get_client_ip(request)
    session_duration = timedelta(days=30) if data.remember_me else timedelta(days=7)
    session = UserSession(
        user_id=user.id,
        token=refresh_token,
        ip_address=ip,
        user_agent=request.headers.get("user-agent"),
        expires_at=datetime.utcnow() + session_duration,
    )
    db.add(session)
    db.commit()
    log_audit(db, user.id, "LOGIN", "user", user.id, ip_address=ip)

    response_data = {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "requires_2fa": tfa_enabled,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "avatar_url": user.avatar_url,
            "department": user.department,
            "designation": user.designation,
            "company_id": user.company_id,
            "is_verified": user.is_verified,
            "force_password_change": user.force_password_change,
        },
    }
    origin = request.headers.get("origin", "https://impact-sensei.vercel.app")
    response = JSONResponse(content=response_data)
    response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Credentials"] = "true"
    return response


@router.post("/refresh")
async def refresh_token(data: RefreshTokenRequest, db: Session = Depends(get_db)):
    payload = decode_token(data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user = db.query(User).filter(User.id == int(payload.get("sub", 0))).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    session = (
        db.query(UserSession)
        .filter(
            UserSession.user_id == user.id,
            UserSession.token == data.refresh_token,
        )
        .first()
    )
    if not session:
        raise HTTPException(status_code=401, detail="Refresh token has been rotated")
    if session.expires_at and session.expires_at < datetime.utcnow():
        db.delete(session)
        db.commit()
        raise HTTPException(status_code=401, detail="Refresh token expired")

    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "tfa_verified": payload.get("tfa_verified") is True,
    }
    new_access = create_access_token(token_data)
    new_refresh = create_refresh_token(token_data)
    session.token = new_refresh
    session.expires_at = datetime.utcnow() + timedelta(days=7)
    db.commit()
    return {
        "access_token": new_access,
        "refresh_token": new_refresh,
        "token_type": "bearer",
    }


@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    db.query(UserSession).filter(UserSession.user_id == current_user.id).delete()
    db.commit()
    log_audit(db, current_user.id, "LOGOUT", "user", current_user.id)
    return {"message": "Logged out successfully"}


@router.post("/verify-email")
async def verify_email(data: VerifyEmailRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email_verification_token == data.token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    user.is_verified = True
    user.email_verification_token = None
    db.commit()
    send_welcome_email(user.email, user.full_name)
    log_audit(db, user.id, "VERIFY_EMAIL", "user", user.id)
    return {"message": "Email verified! You can now login."}


@router.post("/resend-verification")
async def resend_verification(
    data: ResendVerificationRequest, db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or user.is_verified:
        return {
            "message": "If the email exists and is unverified, a code has been sent."
        }
    token = generate_verification_token()
    user.email_verification_token = token
    db.commit()
    send_verification_email(data.email, token)
    return {"message": "Verification email sent"}


@router.post("/google")
async def google_auth(request: Request, db: Session = Depends(get_db)):
    # Standard endpoint to handle Google OAuth token verification
    import httpx
    body = await request.json()
    token = body.get("token")
    if not token:
        raise HTTPException(status_code=400, detail="Token is required")
        
    try:
        # Verify token with Google
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={token}")
            if resp.status_code != 200:
                raise HTTPException(status_code=400, detail="Invalid Google token")
            
            user_info = resp.json()
            email = user_info.get("email")
            name = user_info.get("name")
            
            if not email:
                raise HTTPException(status_code=400, detail="Email not provided by Google")
                
            user = db.query(User).filter(User.email == email).first()
            if not user:
                # Auto-create account
                user = User(
                    email=email,
                    full_name=name or "Google User",
                    password_hash="google_sso", # Not usable for standard login
                    role="client",
                    is_verified=True, # Trusted email from Google
                    is_active=True
                )
                db.add(user)
                db.commit()
                db.refresh(user)
                
            # Create session
            access_token = create_access_token(
                {"sub": str(user.id), "role": user.role, "tfa_verified": True}
            )
            refresh_token = create_refresh_token(
                {"sub": str(user.id), "role": user.role, "tfa_verified": True}
            )
            
            # Save session
            session = UserSession(
                user_id=user.id,
                token=refresh_token,
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent"),
                expires_at=datetime.utcnow() + timedelta(days=7),
            )
            db.add(session)
            db.commit()
            
            return {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": "bearer",
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "role": user.role,
                    "full_name": user.full_name,
                },
            }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))



@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if user:
        token = generate_reset_token()
        user.password_reset_token = token
        user.password_reset_expires = datetime.utcnow() + timedelta(hours=1)
        db.commit()
        send_password_reset_email(data.email, token)
    return {"message": "If the email exists, a reset link has been sent."}


@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.password_reset_token == data.token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    if user.password_reset_expires and user.password_reset_expires < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Reset token expired")
    user.password_hash = hash_password(data.new_password)
    user.password_reset_token = None
    user.password_reset_expires = None
    user.force_password_change = False
    db.commit()
    log_audit(db, user.id, "RESET_PASSWORD", "user", user.id)
    return {"message": "Password reset successfully."}


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "company_id": current_user.company_id,
        "department": current_user.department,
        "designation": current_user.designation,
        "phone": current_user.phone,
        "avatar_url": current_user.avatar_url,
        "is_active": current_user.is_active,
        "is_verified": current_user.is_verified,
        "force_password_change": current_user.force_password_change,
        "last_login": current_user.last_login,
        "created_at": current_user.created_at,
    }


@router.put("/me")
async def update_profile(
    data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(current_user, key, value)
    current_user.updated_at = datetime.utcnow()
    db.commit()
    log_audit(
        db,
        current_user.id,
        "UPDATE",
        "user",
        current_user.id,
        details="Profile updated",
    )
    return {"message": "Profile updated successfully"}


@router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.password_hash = hash_password(data.new_password)
    current_user.force_password_change = False
    current_user.updated_at = datetime.utcnow()
    db.commit()
    log_audit(db, current_user.id, "CHANGE_PASSWORD", "user", current_user.id)
    return {"message": "Password changed successfully"}
