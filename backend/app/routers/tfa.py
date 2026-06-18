"""
2FA / TOTP Router
Google Authenticator compatible.
Endpoints: setup, verify, disable, backup codes.
"""

import io
import json
import os
import secrets
import string

import pyotp
import qrcode
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..auth import create_access_token, create_refresh_token
from ..database import get_db
from ..dependencies import get_current_user, get_current_user_allow_pending_2fa
from ..models import User
from ..utils.audit import log_audit

router = APIRouter(prefix="/api/auth/2fa", tags=["2FA"])

APP_NAME = "Impact Grid"
BACKUP_CODE_COUNT = 8


# ── Schemas ─────────────────────────────────────────────────────────────────

class TFAVerifyRequest(BaseModel):
    code: str


class TFADisableRequest(BaseModel):
    code: str  # current TOTP or backup code


# ── Helpers ──────────────────────────────────────────────────────────────────

def _generate_backup_codes() -> list[str]:
    """Generate 8 random 8-character alphanumeric backup codes."""
    alphabet = string.ascii_uppercase + string.digits
    return ["".join(secrets.choice(alphabet) for _ in range(8)) for _ in range(BACKUP_CODE_COUNT)]


def _get_2fa_data(user: User) -> dict:
    """Parse 2FA JSON stored in user.preferences."""
    try:
        prefs = json.loads(user.preferences or "{}")
        return prefs.get("tfa", {})
    except Exception:
        return {}


def _save_2fa_data(user: User, tfa: dict, db: Session) -> None:
    try:
        prefs = json.loads(user.preferences or "{}")
    except Exception:
        prefs = {}
    prefs["tfa"] = tfa
    user.preferences = json.dumps(prefs)
    db.commit()


# ── Setup — generate secret + QR code ────────────────────────────────────────

@router.post("/setup")
async def setup_2fa(
    current_user: User = Depends(get_current_user_allow_pending_2fa),
    db: Session = Depends(get_db),
):
    """Generate a TOTP secret and return provisioning info."""
    tfa = _get_2fa_data(current_user)
    if tfa.get("enabled"):
        raise HTTPException(400, "2FA is already enabled. Disable it first.")

    # Generate a new secret and store it temporarily (not yet "enabled")
    secret = pyotp.random_base32()
    tfa_pending = {"secret": secret, "enabled": False, "backup_codes": []}
    _save_2fa_data(current_user, tfa_pending, db)

    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(name=current_user.email, issuer_name=APP_NAME)

    # Generate QR code image as PNG bytes
    qr = qrcode.QRCode(box_size=8, border=2)
    qr.add_data(uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    return {
        "secret": secret,
        "qr_data_url": f"data:image/png;base64,{__import__('base64').b64encode(buf.read()).decode()}",
        "provisioning_uri": uri,
        "message": "Scan the QR code with Google Authenticator, then call /verify to enable.",
    }


@router.get("/qr")
async def get_qr_image(
    current_user: User = Depends(get_current_user_allow_pending_2fa),
):
    """Return QR code as a PNG image stream."""
    tfa = _get_2fa_data(current_user)
    secret = tfa.get("secret")
    if not secret:
        raise HTTPException(400, "Run /setup first.")

    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(name=current_user.email, issuer_name=APP_NAME)

    qr = qrcode.QRCode(box_size=8, border=2)
    qr.add_data(uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    return StreamingResponse(buf, media_type="image/png")


# ── Verify & Enable ────────────────────────────────────────────────────────────

@router.post("/verify")
async def verify_and_enable_2fa(
    data: TFAVerifyRequest,
    current_user: User = Depends(get_current_user_allow_pending_2fa),
    db: Session = Depends(get_db),
):
    """Verify the TOTP code and enable 2FA."""
    tfa = _get_2fa_data(current_user)
    secret = tfa.get("secret")
    if not secret:
        raise HTTPException(400, "Call /setup first.")
    if tfa.get("enabled"):
        raise HTTPException(400, "2FA already enabled.")

    totp = pyotp.TOTP(secret)
    if not totp.verify(data.code, valid_window=1):
        raise HTTPException(400, "Invalid TOTP code. Please try again.")

    backup_codes = _generate_backup_codes()
    # Store hashed backup codes
    tfa["enabled"] = True
    tfa["backup_codes"] = backup_codes  # In production: hash these
    _save_2fa_data(current_user, tfa, db)
    log_audit(db, current_user.id, "ENABLE_2FA", "user", current_user.id)

    return {
        "success": True,
        "backup_codes": backup_codes,
        "access_token": create_access_token(
            {
                "sub": str(current_user.id),
                "email": current_user.email,
                "role": current_user.role,
                "tfa_verified": True,
            }
        ),
        "refresh_token": create_refresh_token(
            {
                "sub": str(current_user.id),
                "email": current_user.email,
                "role": current_user.role,
                "tfa_verified": True,
            }
        ),
        "message": "2FA enabled. Save these backup codes in a safe place!",
    }


# ── Status ────────────────────────────────────────────────────────────────────

@router.get("/status")
async def get_2fa_status(current_user: User = Depends(get_current_user)):
    tfa = _get_2fa_data(current_user)
    return {
        "enabled": tfa.get("enabled", False),
        "backup_codes_remaining": len([c for c in tfa.get("backup_codes", []) if c]),
    }


# ── Backup Codes ──────────────────────────────────────────────────────────────

@router.get("/backup-codes")
async def get_backup_codes(
    current_user: User = Depends(get_current_user_allow_pending_2fa),
    db: Session = Depends(get_db),
):
    """Regenerate and return fresh backup codes."""
    tfa = _get_2fa_data(current_user)
    if not tfa.get("enabled"):
        raise HTTPException(400, "2FA is not enabled.")

    new_codes = _generate_backup_codes()
    tfa["backup_codes"] = new_codes
    _save_2fa_data(current_user, tfa, db)

    return {"backup_codes": new_codes}


# ── Disable ────────────────────────────────────────────────────────────────────

@router.post("/disable")
async def disable_2fa(
    data: TFADisableRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tfa = _get_2fa_data(current_user)
    if not tfa.get("enabled"):
        raise HTTPException(400, "2FA is not enabled.")

    secret = tfa.get("secret", "")
    totp = pyotp.TOTP(secret)
    backup_codes = tfa.get("backup_codes", [])

    valid = totp.verify(data.code, valid_window=1) or data.code in backup_codes
    if not valid:
        raise HTTPException(400, "Invalid code.")

    _save_2fa_data(current_user, {"enabled": False, "secret": None, "backup_codes": []}, db)
    log_audit(db, current_user.id, "DISABLE_2FA", "user", current_user.id)

    return {"success": True, "message": "2FA disabled."}
