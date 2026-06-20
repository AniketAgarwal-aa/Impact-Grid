"""
Impact Grid - Database Configuration
SQLAlchemy 2.0 with auto-initialization
"""

import os

from sqlalchemy import create_engine, event, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

_raw = (
    os.getenv("DATABASE_URL", "sqlite:///./impact_sensei.db").strip().strip('"')
)

# Render/Heroku often provide postgres:// ; SQLAlchemy 2 expects postgresql://
if _raw.startswith("postgres://"):
    _raw = _raw.replace("postgres://", "postgresql://", 1)

DATABASE_URL = _raw

connect_args: dict = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
elif DATABASE_URL.startswith("postgresql"):
    # Hosted Postgres (e.g. Render) typically requires TLS; skip for local dev DBs
    if "localhost" not in DATABASE_URL and "127.0.0.1" not in DATABASE_URL:
        connect_args = {"sslmode": "require"}

try:
    engine = create_engine(DATABASE_URL, connect_args=connect_args)
    # Test the connection immediately
    with engine.connect() as conn:
        pass
except Exception as e:
    print(f"[WARN] Database connection failed for {DATABASE_URL}: {e}")
    print("[INFO] Falling back to local SQLite database: sqlite:///./impact_sensei.db")
    DATABASE_URL = "sqlite:///./impact_sensei.db"
    connect_args = {"check_same_thread": False}
    engine = create_engine(DATABASE_URL, connect_args=connect_args)

# Enable WAL mode for SQLite (better concurrent reads)
if DATABASE_URL.startswith("sqlite"):

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def _widen_user_sessions_token_postgres() -> None:
    """Existing Postgres DBs may still have VARCHAR(255); JWT refresh tokens are longer."""
    if not DATABASE_URL.startswith("postgresql"):
        return
    try:
        with engine.begin() as conn:
            conn.execute(
                text("ALTER TABLE user_sessions ALTER COLUMN token TYPE TEXT")
            )
        print("[OK] user_sessions.token widened to TEXT (Postgres)")
    except Exception as e:
        # Table missing, already TEXT, or permission — startup should not crash
        print(f"[migrate] user_sessions.token skip: {e}")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


DEFAULT_SETTINGS = [
    ("app.name", "Impact Grid", "string", "Application name", "general"),
    (
        "auth.session_timeout_minutes",
        "30",
        "number",
        "Session timeout in minutes",
        "auth",
    ),
    ("auth.max_login_attempts", "5", "number", "Max failed login attempts", "auth"),
    (
        "auth.require_email_verification",
        "true",
        "boolean",
        "Require email verification on signup",
        "auth",
    ),
    ("currency.default", "INR", "string", "Default display currency", "currency"),
    (
        "currency.exchange_rate_usd_to_inr",
        "83.5",
        "number",
        "USD to INR exchange rate",
        "currency",
    ),
    (
        "exchange_rate_api_url",
        "https://api.exchangerate-api.com/v4/latest/USD",
        "string",
        "Live exchange rate API URL",
        "currency",
    ),
    ("smtp_host", "smtp.gmail.com", "string", "SMTP server hostname", "email"),
    ("smtp_port", "587", "number", "SMTP port", "email"),
    ("smtp_user", "", "string", "SMTP username", "email"),
    ("smtp_password", "", "string", "SMTP password (encrypted)", "email"),
    (
        "from_email",
        "noreply@impactgrid.com",
        "string",
        "Sender email address",
        "email",
    ),
]


def _ensure_user_columns() -> None:
    """Add new user columns on existing SQLite/Postgres DBs."""
    cols = [
        ("users", "client_id", "VARCHAR(20)"),
        ("users", "original_email", "VARCHAR(255)"),
    ]
    try:
        with engine.begin() as conn:
            for table, col, col_type in cols:
                try:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}"))
                    print(f"[OK] Added {table}.{col}")
                except Exception:
                    pass
    except Exception as e:
        print(f"[migrate] user columns skip: {e}")


def init_db():
    """Initialize database tables and default settings."""
    from .models import (
        AuditLog,
        ChangeRequest,
        Comment,
        CommentReaction,
        Company,
        ExchangeRate,
        ImpactAnalysis,
        Notification,
        Project,
        ProjectAssignment,
        Requirement,
        RequirementDependency,
        Scenario,
        SystemSetting,
        Template,
        User,
        UserSession,
        EmailQueue, WebhookConfig, WebhookDelivery, ScheduledReport,
        ReportTemplate, WhiteLabelConfig, OAuthToken, TFASecret, UserDevice,
        Sprint, SprintTask, TeamAvailability, SatisfactionSurvey, ReleaseNote,
        RbacPermission, SlaConfig, IntegrationLog, IpWhitelist
    )

    Base.metadata.create_all(bind=engine)
    _widen_user_sessions_token_postgres()
    _ensure_user_columns()

    db = SessionLocal()
    try:
        for key, value, type_, desc, cat in DEFAULT_SETTINGS:
            existing = db.query(SystemSetting).filter(SystemSetting.key == key).first()
            if not existing:
                db.add(
                    SystemSetting(
                        key=key, value=value, type=type_, description=desc, category=cat
                    )
                )
            else:
                # Force-update critical security settings so old DBs with wrong defaults get corrected
                if key == "auth.require_email_verification" and existing.value != "true":
                    existing.value = "true"
                    print(f"[OK] Corrected {key} to 'true' (was '{existing.value}')")

        # Seed fallback exchange rates
        fallback_rates = [
            ("USD", "INR", 83.5),
            ("USD", "EUR", 0.92),
            ("USD", "GBP", 0.79),
            ("USD", "CAD", 1.35),
            ("USD", "AUD", 1.52),
            ("USD", "SGD", 1.34),
            ("USD", "JPY", 150.2),
            ("USD", "USD", 1.0),
        ]
        for fc, tc, rate in fallback_rates:
            existing = (
                db.query(ExchangeRate)
                .filter(
                    ExchangeRate.from_currency == fc, ExchangeRate.to_currency == tc
                )
                .first()
            )
            if not existing:
                db.add(ExchangeRate(from_currency=fc, to_currency=tc, rate=rate))

        # Hardcoded Admin User
        from .auth import hash_password

        from .constants import SUPER_ADMIN_EMAILS

        seeded_admins = [
            ("admin1@impactstudio.com", "Admin One"),
            ("admin2@impactstudio.com", "Admin Two"),
        ]

        for admin_email, full_name in seeded_admins:
            existing_admin = db.query(User).filter(User.email == admin_email).first()
            if not existing_admin:
                admin_user = User(
                    email=admin_email,
                    original_email=admin_email,
                    password_hash=hash_password("password"),
                    full_name=full_name,
                    role="admin",
                    is_active=True,
                    is_verified=True,
                )
                db.add(admin_user)
                db.commit()
                print(f"[OK] Seeded super admin '{admin_email}' created (password: password).")
            else:
                existing_admin.role = "admin"
                existing_admin.is_verified = True
                existing_admin.is_active = True
                existing_admin.original_email = admin_email
                db.commit()
                print(f"[OK] Super admin '{admin_email}' reconciled.")

        # Migrate legacy admin emails if present
        legacy_map = {
            "aniketagarwal359@gmail.com": "admin1@impactstudio.com",
            "navyagupta1820@gmail.com": "admin2@impactstudio.com",
        }
        for old_email, new_email in legacy_map.items():
            legacy = db.query(User).filter(User.email == old_email).first()
            if legacy and not db.query(User).filter(User.email == new_email).first():
                legacy.email = new_email
                legacy.original_email = new_email
                legacy.role = "admin"
                legacy.is_verified = True
                db.commit()
                print(f"[OK] Migrated legacy admin {old_email} -> {new_email}")

        # Seed pre-built templates
        from .models import Template
        import json
        prebuilt_templates = [
            {
                "name": "Standard Software Requirement",
                "description": "Standard template for new requirements",
                "category": "requirement",
                "content": {
                    "title": "New Requirement",
                    "description": "A detailed description of the requirement.",
                    "priority": "medium",
                    "effort_hours": 16,
                },
                "variables": ["title", "description", "effort_hours"],
                "is_public": True,
            },
            {
                "name": "API Route Change Request",
                "description": "Template for submitting changes to an existing API route",
                "category": "change_request",
                "content": {
                    "title": "Change API endpoint {endpoint_name}",
                    "reason": "Optimize database queries and response payload",
                    "impact": "Requires frontend updates and database migrations",
                    "risk_level": "medium",
                },
                "variables": ["endpoint_name"],
                "is_public": True,
            },
            {
                "name": "Standard Web Project",
                "description": "Standard starting template for new projects",
                "category": "project",
                "content": {
                    "name": "Web Project",
                    "description": "A standard web application project setup.",
                    "status": "planning",
                    "budget": 50000,
                },
                "variables": ["name", "description", "budget"],
                "is_public": True,
            }
        ]

        for pt in prebuilt_templates:
            existing = db.query(Template).filter(Template.name == pt["name"]).first()
            if not existing:
                db.add(
                    Template(
                        name=pt["name"],
                        description=pt["description"],
                        category=pt["category"],
                        content=json.dumps(pt["content"]),
                        variables=json.dumps(pt["variables"]),
                        is_public=pt["is_public"],
                        company_id=None,
                        created_by=None,
                    )
                )

        # Seed Sample PM and Client
        pm_email = "pm@impactgrid.com"
        client_email = "client@impactgrid.com"

        pm_user = db.query(User).filter(User.email == pm_email).first()
        if not pm_user:
            pm_user = User(
                email=pm_email,
                original_email=pm_email,
                password_hash=hash_password("password123"),
                full_name="Sarah Johnson",
                role="project_manager",
                department="Engineering",
                is_active=True,
                is_verified=True,
            )
            db.add(pm_user)
            db.commit()
            print(f"[OK] Seeded PM '{pm_email}'.")

        client_user = db.query(User).filter(User.email == client_email).first()
        if not client_user:
            client_user = User(
                email=client_email,
                original_email=client_email,
                password_hash=hash_password("password123"),
                full_name="Michael Chen",
                role="client",
                department="Product",
                client_id="CLT-1001",
                is_active=True,
                is_verified=True,
            )
            db.add(client_user)
            db.commit()
            print(f"[OK] Seeded Client '{client_email}'.")

        # Seed Sample Project
        sample_project_name = "E-Commerce Platform Redesign"
        sample_project = db.query(Project).filter(Project.name == sample_project_name).first()
        if not sample_project:
            sample_project = Project(
                name=sample_project_name,
                description="Complete redesign of the e-commerce platform with modern UI/UX",
                budget=250000.00,
                initial_duration=90,
                team_size=6,
                stage="mid",
                currency="USD",
                owner_id=pm_user.id
            )
            db.add(sample_project)
            db.commit()
            print(f"[OK] Seeded Project '{sample_project_name}'.")

        # Seed Sample Requirement and Change Request
        sample_req_title = "Authentication System"
        sample_req = db.query(Requirement).filter(Requirement.title == sample_req_title).first()
        if not sample_req:
            sample_req = Requirement(
                project_id=sample_project.id,
                title=sample_req_title,
                description="Core authentication system",
                created_by=pm_user.id
            )
            db.add(sample_req)
            db.commit()

        sample_cr_desc = "Implement MFA using TOTP for enhanced security"
        sample_cr = db.query(ChangeRequest).filter(ChangeRequest.description == sample_cr_desc).first()
        if not sample_cr:
            sample_cr = ChangeRequest(
                requirement_id=sample_req.id,
                change_type="addition",
                priority="high",
                complexity="medium",
                description=sample_cr_desc,
                status="submitted",
                submitted_by=client_user.id
            )
            db.add(sample_cr)
            db.commit()
            print(f"[OK] Seeded Change Request for MFA.")

        # Seed Indian Sample PM and Client
        indian_pm_email = "rahul@impactgrid.com"
        indian_client_email = "priya@impactgrid.com"

        indian_pm_user = db.query(User).filter(User.email == indian_pm_email).first()
        if not indian_pm_user:
            indian_pm_user = User(
                email=indian_pm_email,
                original_email=indian_pm_email,
                password_hash=hash_password("password123"),
                full_name="Rahul Sharma",
                role="project_manager",
                department="Engineering",
                is_active=True,
                is_verified=True,
            )
            db.add(indian_pm_user)
            db.commit()

        indian_client_user = db.query(User).filter(User.email == indian_client_email).first()
        if not indian_client_user:
            indian_client_user = User(
                email=indian_client_email,
                original_email=indian_client_email,
                password_hash=hash_password("password123"),
                full_name="Priya Patel",
                role="client",
                department="Product",
                client_id="CLT-1002",
                is_active=True,
                is_verified=True,
            )
            db.add(indian_client_user)
            db.commit()

        # Seed Sample Indian Project
        indian_project_name = "UPI Gateway Integration"
        indian_project = db.query(Project).filter(Project.name == indian_project_name).first()
        if not indian_project:
            indian_project = Project(
                name=indian_project_name,
                description="Integrating UPI gateway for real-time payments",
                budget=850000.00,
                initial_duration=120,
                team_size=8,
                stage="early",
                currency="INR",
                owner_id=indian_pm_user.id
            )
            db.add(indian_project)
            db.commit()

        # Seed Indian Requirement
        indian_req_title = "Payment Processor Module"
        indian_req = db.query(Requirement).filter(Requirement.title == indian_req_title).first()
        if not indian_req:
            indian_req = Requirement(
                project_id=indian_project.id,
                title=indian_req_title,
                description="Core payment processing logic for UPI",
                created_by=indian_pm_user.id
            )
            db.add(indian_req)
            db.commit()

        indian_cr_desc = "Add support for multiple UPI apps (GPay, PhonePe, Paytm)"
        indian_cr = db.query(ChangeRequest).filter(ChangeRequest.description == indian_cr_desc).first()
        if not indian_cr:
            indian_cr = ChangeRequest(
                requirement_id=indian_req.id,
                change_type="addition",
                priority="high",
                complexity="high",
                description=indian_cr_desc,
                status="submitted",
                submitted_by=indian_client_user.id
            )
            db.add(indian_cr)
            db.commit()

        db.commit()
        print("[OK] Database initialized successfully (v5.1)")
    except Exception as e:
        db.rollback()
        print(f"[WARN] DB init error: {e}")
    finally:
        db.close()
