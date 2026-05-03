import os
from cryptography.fernet import Fernet

ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")
if not ENCRYPTION_KEY:
    # Generate a default key if not provided (for dev). In prod, it MUST be set.
    ENCRYPTION_KEY = Fernet.generate_key().decode()

_fernet = Fernet(ENCRYPTION_KEY.encode())

def encrypt_value(value: str) -> str:
    if not value: return value
    return _fernet.encrypt(value.encode()).decode()

def decrypt_value(encrypted: str) -> str:
    if not encrypted: return encrypted
    try:
        return _fernet.decrypt(encrypted.encode()).decode()
    except Exception:
        return encrypted

def rotate_key(new_key: str):
    global _fernet, ENCRYPTION_KEY
    ENCRYPTION_KEY = new_key
    _fernet = Fernet(new_key.encode())
