"""
ImpactSensei v5.0 - Admin Creation Script
Creates initial admin user (run once after deployment)

Usage: python create_admin.py
Default: admin@impactsensei.com / Admin@ImpactSensei2024
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, init_db
from app.models import User
from app.auth import hash_password


def create_default_admin():
    """Create the default admin account (non-interactive for CI/CD)"""
    init_db()
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == "admin@impactsensei.com").first()
        if existing:
            print(f"Admin already exists: {existing.email}")
            return existing

        admin = User(
            email="admin@impactsensei.com",
            password_hash=hash_password("Admin@ImpactSensei2024"),
            full_name="System Administrator",
            role="admin",
            is_verified=True,
            is_active=True,
            force_password_change=True,
        )
        db.add(admin); db.commit()
        print("\n✅ Default admin created!")
        print("   Email:    admin@impactsensei.com")
        print("   Password: Admin@ImpactSensei2024")
        print("⚠️  Change the password on first login!\n")
        return admin
    finally:
        db.close()


def create_admin_interactive():
    """Interactive admin creation"""
    init_db()
    db = SessionLocal()
    try:
        email = input("Admin Email [admin@impactsensei.com]: ").strip() or "admin@impactsensei.com"
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"❌ '{email}' is already registered.")
            return

        full_name = input("Full Name [System Administrator]: ").strip() or "System Administrator"
        password = input("Password [Admin@ImpactSensei2024]: ").strip() or "Admin@ImpactSensei2024"
        if len(password) < 8:
            print("❌ Password must be at least 8 characters.")
            return

        admin = User(
            email=email,
            password_hash=hash_password(password),
            full_name=full_name,
            role="admin",
            is_verified=True,
            is_active=True,
            force_password_change=True,
        )
        db.add(admin); db.commit()
        print(f"\n✅ Admin created: {email}")
        print("⚠️  Change the password on first login!")
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    if "--default" in sys.argv or "--yes" in sys.argv or "-y" in sys.argv:
        create_default_admin()
    else:
        print("=" * 50)
        print("🎯 ImpactSensei v5.0 — Admin Setup")
        print("=" * 50)
        mode = input("Create default admin? (y/n) [y]: ").strip().lower()
        if mode in ("", "y", "yes"):
            create_default_admin()
        else:
            create_admin_interactive()
