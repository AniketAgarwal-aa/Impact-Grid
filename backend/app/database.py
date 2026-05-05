"""
ImpactSensei v5.0 - Database Configuration
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
    ("app.name", "ImpactSensei", "string", "Application name", "general"),
    ("app.version", "5.0.0", "string", "Application version", "general"),
    ("app.tagline", "Master Your Project Changes", "string", "App tagline", "general"),
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
        "false",
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
        "currency.exchange_rate_update_hours",
        "6",
        "number",
        "Hours between rate updates",
        "currency",
    ),
    (
        "exchange_rate_api_url",
        "https://api.exchangerate-api.com/v4/latest/USD",
        "string",
        "Live exchange rate API URL",
        "currency",
    ),
    (
        "notifications.email_enabled",
        "false",
        "boolean",
        "Enable email notifications",
        "notifications",
    ),
    (
        "analysis.default_confidence",
        "85",
        "number",
        "Default confidence score",
        "analysis",
    ),
    ("analysis.calculation_version", "5.0", "string", "Calculator version", "analysis"),
    ("export.max_rows_csv", "10000", "number", "Max CSV export rows", "export"),
    ("smtp_host", "smtp.gmail.com", "string", "SMTP server hostname", "email"),
    ("smtp_port", "587", "number", "SMTP port", "email"),
    ("smtp_user", "", "string", "SMTP username", "email"),
    ("smtp_password", "", "string", "SMTP password (encrypted)", "email"),
    (
        "from_email",
        "noreply@impactsensei.com",
        "string",
        "Sender email address",
        "email",
    ),
]


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

        seeded_admins = [
            ("aniketagarwal359@gmail.com", "Aniket Agarwal"),
            ("navyagupta1820@gmail.com", "Navya Gupta"),
        ]

        for admin_email, full_name in seeded_admins:
            existing_admin = db.query(User).filter(User.email == admin_email).first()
            if not existing_admin:
                admin_user = User(
                    email=admin_email,
                    password_hash=hash_password("password"),
                    full_name=full_name,
                    role="admin",
                    is_active=True,
                    is_verified=True,
                )
                db.add(admin_user)
                db.commit()
                print(f"[OK] Seeded admin '{admin_email}' created (default password).")
            else:
                # Ensure seeded admins never drift to PM/client
                if existing_admin.role != "admin" or not existing_admin.is_verified:
                    existing_admin.role = "admin"
                    existing_admin.is_verified = True
                    existing_admin.is_active = True
                    db.commit()
                    print(f"[OK] Seeded admin '{admin_email}' reconciled to role=admin.")

        db.commit()
        print("[OK] Database initialized successfully (v5.1)")
    except Exception as e:
        db.rollback()
        print(f"[WARN] DB init error: {e}")
    finally:
        db.close()
