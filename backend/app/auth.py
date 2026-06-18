"""
Impact Grid - JWT Auth helpers
"""

import os
import secrets
import string
from datetime import datetime, timedelta

import bcrypt
from jose import JWTError, jwt

# Use a stable fallback key in development so auto-reload does not invalidate
# tokens between requests. Production should set SECRET_KEY via environment.
SECRET_KEY = os.getenv("SECRET_KEY", "impactsensei-dev-secret-key-change-me")
ALGORITHM = "HS256"
ACCESS_EXPIRE_MINUTES = 15
REFRESH_EXPIRE_DAYS = 7
SESSION_TIMEOUT_MINUTES = 1440  # 24 hours (1 day)

BCRYPT_ROUNDS = 12


def hash_password(password: str) -> str:
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt(rounds=BCRYPT_ROUNDS),
    ).decode("ascii")


def verify_password(plain: str, hashed: str) -> bool:
    if not hashed or not plain:
        return False
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("ascii"))
    except (ValueError, TypeError):
        return False


def create_access_token(data: dict) -> str:
    payload = {
        **data,
        "type": "access",
        "jti": secrets.token_urlsafe(12),
        "exp": datetime.utcnow() + timedelta(minutes=ACCESS_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict) -> str:
    payload = {
        **data,
        "type": "refresh",
        "jti": secrets.token_urlsafe(16),
        "exp": datetime.utcnow() + timedelta(days=REFRESH_EXPIRE_DAYS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


def generate_verification_token(length: int = 6) -> str:
    """6-digit numeric code for email verification"""
    return "".join(secrets.choice(string.digits) for _ in range(length))


def generate_reset_token() -> str:
    return secrets.token_urlsafe(32)
