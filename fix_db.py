"""
ImpactSensei - Emergency Fix Script
Run this to:
1. Fix email verification setting to 'true'
2. Fix Navya's role back to admin  
3. Fix all seeded admins
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.app.database import SessionLocal
from backend.app.models import User, SystemSetting
from backend.app.auth import hash_password

db = SessionLocal()

try:
    # 1. Fix email verification setting
    setting = db.query(SystemSetting).filter(SystemSetting.key == "auth.require_email_verification").first()
    if setting:
        old_val = setting.value
        setting.value = "true"
        print(f"[FIX] auth.require_email_verification: '{old_val}' -> 'true'")
    else:
        db.add(SystemSetting(
            key="auth.require_email_verification",
            value="true",
            type="boolean",
            description="Require email verification on signup",
            category="auth"
        ))
        print("[FIX] Created auth.require_email_verification = 'true'")

    # 2. Fix seeded admin accounts
    seeded_admins = [
        ("admin1@impactstudio.com", "Admin One"),
        ("admin2@impactstudio.com", "Admin Two"),
    ]

    for email, name in seeded_admins:
        user = db.query(User).filter(User.email == email).first()
        if user:
            changes = []
            if user.role != "admin":
                changes.append(f"role: '{user.role}' -> 'admin'")
                user.role = "admin"
            if not user.is_verified:
                changes.append("is_verified: False -> True")
                user.is_verified = True
            if not user.is_active:
                changes.append("is_active: False -> True")
                user.is_active = True
            if changes:
                print(f"[FIX] User {email}: {', '.join(changes)}")
            else:
                print(f"[OK]  User {email}: already correct (role=admin, verified=True)")
        else:
            # Create the admin
            u = User(
                email=email,
                password_hash=hash_password("password"),
                full_name=name,
                role="admin",
                is_active=True,
                is_verified=True,
            )
            db.add(u)
            print(f"[FIX] Created admin user: {email}")

    db.commit()
    print("\n✅ All fixes applied successfully!")
    print("\nIMPORTANT: If you changed the password for seeded admins, the default is 'password'")
    print("Please change passwords after login via Profile → Change Password")

except Exception as e:
    db.rollback()
    print(f"❌ Error: {e}")
    raise
finally:
    db.close()
