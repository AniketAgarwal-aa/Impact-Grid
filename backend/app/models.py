"""
ImpactSensei v5.0 - Complete Database Models
Multi-tenant: Companies → PMs → Projects → Clients
"""

from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from .database import Base


class Company(Base):
    __tablename__ = "companies"
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    logo_url = Column(String(500))
    subscription_tier = Column(String(50), default="free")
    max_projects = Column(Integer, default=10)
    max_users = Column(Integer, default=50)
    max_storage_mb = Column(Integer, default=1024)
    settings = Column(Text)
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id", use_alter=True), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    users = relationship(
        "User", back_populates="company", foreign_keys="User.company_id"
    )
    projects = relationship("Project", back_populates="company")
    templates = relationship("Template", back_populates="company")


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    company_id = Column(
        Integer, ForeignKey("companies.id", ondelete="SET NULL"), nullable=True
    )
    email = Column(String(255), unique=True, nullable=False, index=True)
    original_email = Column(String(255))
    client_id = Column(String(20), unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    avatar_url = Column(String(500))
    # Roles: admin | project_manager | client
    role = Column(String(50), default="client", index=True)
    department = Column(String(100))
    designation = Column(String(100))
    phone = Column(String(20))
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    force_password_change = Column(Boolean, default=False)
    email_verification_token = Column(String(255))
    password_reset_token = Column(String(255))
    password_reset_expires = Column(DateTime)
    last_login = Column(DateTime)
    preferences = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = relationship("Company", back_populates="users", foreign_keys=[company_id])
    sessions = relationship(
        "UserSession", back_populates="user", cascade="all, delete-orphan"
    )
    project_assignments = relationship(
        "ProjectAssignment",
        back_populates="user",
        foreign_keys="ProjectAssignment.user_id",
    )
    __table_args__ = (
        Index("idx_users_company", "company_id"),
        Index("idx_users_email", "email"),
    )

class UserSession(Base):
    __tablename__ = "user_sessions"
    id = Column(Integer, primary_key=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    # JWT refresh tokens exceed 255 chars (email + role + jti + expiry)
    token = Column(Text)
    ip_address = Column(String(45))
    user_agent = Column(Text)
    expires_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="sessions")


class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True)
    company_id = Column(
        Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=True
    )
    name = Column(String(255), nullable=False)
    description = Column(Text)
    team_size = Column(Integer, default=1)
    cost_per_day = Column(Numeric(10, 2), default=0)
    initial_duration = Column(Integer, default=30)
    stage = Column(String(50), default="mid")
    currency = Column(String(3), default="INR")
    status = Column(String(50), default="active")
    priority = Column(String(50), default="medium")
    budget = Column(Numeric(15, 2))
    actual_cost = Column(Numeric(15, 2), default=0)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    start_date = Column(Date)
    end_date = Column(Date)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = relationship("Company", back_populates="projects")
    assignments = relationship(
        "ProjectAssignment", back_populates="project", cascade="all, delete-orphan"
    )
    requirements = relationship(
        "Requirement", back_populates="project", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_projects_company", "company_id"),
        Index("idx_projects_owner", "owner_id"),
    )


class ProjectClient(Base):
    __tablename__ = "project_clients"
    id = Column(Integer, primary_key=True)
    project_id = Column(
        Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    client_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    linked_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    linked_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (UniqueConstraint("project_id", "client_id"),)


class ProjectAssignment(Base):
    __tablename__ = "project_assignments"
    id = Column(Integer, primary_key=True)
    project_id = Column(
        Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    role = Column(String(50), default="viewer")
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="assignments")
    user = relationship(
        "User", back_populates="project_assignments", foreign_keys=[user_id]
    )

    __table_args__ = (UniqueConstraint("project_id", "user_id"),)


class Requirement(Base):
    __tablename__ = "requirements"
    id = Column(Integer, primary_key=True)
    project_id = Column(
        Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    title = Column(String(500), nullable=False)
    description = Column(Text)
    complexity = Column(String(50), nullable=False, default="medium")
    dependency_level = Column(String(50), default="moderate")
    priority = Column(String(50), default="medium")
    status = Column(String(50), default="active")
    category = Column(String(100))
    estimated_hours = Column(Integer)
    actual_hours = Column(Integer)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", back_populates="requirements")
    change_requests = relationship(
        "ChangeRequest", back_populates="requirement", cascade="all, delete-orphan"
    )


class RequirementDependency(Base):
    __tablename__ = "requirement_dependencies"
    id = Column(Integer, primary_key=True)
    requirement_id = Column(
        Integer, ForeignKey("requirements.id", ondelete="CASCADE"), nullable=False
    )
    depends_on_id = Column(
        Integer, ForeignKey("requirements.id", ondelete="CASCADE"), nullable=False
    )
    dependency_type = Column(String(50), default="blocked_by")
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (UniqueConstraint("requirement_id", "depends_on_id"),)


class ChangeRequest(Base):
    __tablename__ = "change_requests"
    id = Column(Integer, primary_key=True)
    requirement_id = Column(
        Integer, ForeignKey("requirements.id", ondelete="CASCADE"), nullable=False
    )
    change_type = Column(String(50), nullable=False)
    priority = Column(String(50), nullable=False, default="medium")
    complexity = Column(String(50), nullable=False, default="medium")
    affected_modules = Column(Text)
    description = Column(Text, nullable=False)
    justification = Column(Text)
    expected_benefits = Column(Text)
    risks = Column(Text)
    status = Column(String(50), default="draft", index=True)
    submitted_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approval_comment = Column(Text)
    rejection_reason = Column(Text)
    approval_date = Column(DateTime)
    submitted_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    requirement = relationship("Requirement", back_populates="change_requests")
    analyses = relationship(
        "ImpactAnalysis", back_populates="change_request", cascade="all, delete-orphan"
    )
    __table_args__ = (
        Index("idx_change_requests_requirement", "requirement_id"),
        Index("idx_change_requests_status", "status"),
    )

class ImpactAnalysis(Base):
    __tablename__ = "impact_analyses"
    id = Column(Integer, primary_key=True)
    change_request_id = Column(
        Integer, ForeignKey("change_requests.id", ondelete="CASCADE"), nullable=False
    )
    change_size = Column(String(50))
    confidence_score = Column(Integer, default=85)

    # Cost (6 components)
    cost_original = Column(Numeric(15, 2))
    cost_new = Column(Numeric(15, 2))
    cost_increase = Column(Numeric(15, 2))
    cost_percentage = Column(Numeric(5, 2))
    cost_labor = Column(Numeric(15, 2))
    cost_infrastructure = Column(Numeric(15, 2))
    cost_third_party = Column(Numeric(15, 2))
    cost_contingency = Column(Numeric(15, 2))
    cost_training = Column(Numeric(15, 2))
    cost_documentation = Column(Numeric(15, 2))

    # Time (5 components)
    time_original = Column(Integer)
    time_new = Column(Integer)
    time_increase = Column(Integer)
    time_percentage = Column(Numeric(5, 2))
    time_development = Column(Integer)
    time_testing = Column(Integer)
    time_deployment = Column(Integer)
    time_review = Column(Integer)
    time_documentation = Column(Integer)

    # Effort (3 seniority levels)
    effort_original = Column(Integer)
    effort_new = Column(Integer)
    effort_increase = Column(Integer)
    effort_percentage = Column(Numeric(5, 2))
    effort_senior = Column(Integer)
    effort_mid = Column(Integer)
    effort_junior = Column(Integer)

    # Risk (5 dimensions)
    risk_level = Column(String(50))
    risk_score = Column(Integer)
    risk_schedule = Column(Integer)
    risk_budget = Column(Integer)
    risk_quality = Column(Integer)
    risk_security = Column(Integer)
    risk_technical = Column(Integer)

    # Quality/Performance
    quality_impact = Column(Integer)
    performance_impact = Column(Integer)
    security_impact = Column(Integer)
    maintainability_impact = Column(Integer)

    # JSON fields
    affected_components = Column(Text)
    dependency_chain = Column(Text)
    recommendations = Column(Text)
    alternative_solutions = Column(Text)

    currency = Column(String(3), default="INR")
    calculation_version = Column(String(10), default="5.0")
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    change_request = relationship("ChangeRequest", back_populates="analyses")

    __table_args__ = (Index("idx_analyses_change", "change_request_id"),)


class Scenario(Base):
    __tablename__ = "scenarios"
    id = Column(Integer, primary_key=True)
    project_id = Column(
        Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=True
    )
    name = Column(String(255), nullable=False)
    description = Column(Text)
    analysis_id = Column(
        Integer, ForeignKey("impact_analyses.id", ondelete="CASCADE"), nullable=False
    )
    is_baseline = Column(Boolean, default=False)
    tags = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Comment(Base):
    __tablename__ = "comments"
    id = Column(Integer, primary_key=True)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(Integer, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user_name = Column(String(255))
    user_role = Column(String(50))
    content = Column(Text, nullable=False)
    parent_comment_id = Column(Integer, ForeignKey("comments.id"), nullable=True)
    is_edited = Column(Boolean, default=False)
    visible_to_roles = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (Index("idx_comments_entity", "entity_type", "entity_id"),)


class CommentReaction(Base):
    __tablename__ = "comment_reactions"
    id = Column(Integer, primary_key=True)
    comment_id = Column(
        Integer, ForeignKey("comments.id", ondelete="CASCADE"), nullable=False
    )
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    reaction_type = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    type = Column(String(50))
    title = Column(String(255))
    message = Column(Text)
    link = Column(String(500))
    is_read = Column(Boolean, default=False)
    is_email_sent = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)
    read_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (Index("idx_notifications_user", "user_id"),)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50))
    entity_id = Column(Integer)
    old_values = Column(Text)
    new_values = Column(Text)
    ip_address = Column(String(45))
    user_agent = Column(Text)
    details = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_audit_user", "user_id"),
        Index("idx_audit_company", "company_id"),
    )


class Template(Base):
    __tablename__ = "templates"
    id = Column(Integer, primary_key=True)
    company_id = Column(
        Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=True
    )
    name = Column(String(255), nullable=False)
    description = Column(Text)
    category = Column(String(100))
    content = Column(Text, nullable=False)
    variables = Column(Text)
    is_public = Column(Boolean, default=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    usage_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = relationship("Company", back_populates="templates")


class SystemSetting(Base):
    __tablename__ = "system_settings"
    id = Column(Integer, primary_key=True)
    key = Column(String(255), unique=True, nullable=False)
    value = Column(Text)
    type = Column(String(50), default="string")
    description = Column(Text)
    category = Column(String(100))
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ExchangeRate(Base):
    __tablename__ = "exchange_rates"
    id = Column(Integer, primary_key=True)
    from_currency = Column(String(3), nullable=False)
    to_currency = Column(String(3), nullable=False)
    rate = Column(Numeric(10, 4), nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (UniqueConstraint("from_currency", "to_currency"),)


# ── NEW ENTERPRISE TABLES ────────────────────────────────────────────────────

class EmailQueue(Base):
    __tablename__ = "email_queue"
    id = Column(Integer, primary_key=True)
    recipient = Column(String(255), nullable=False)
    subject = Column(String(500), nullable=False)
    body = Column(Text, nullable=False)
    status = Column(String(50), default="pending")  # pending, sent, failed
    retry_count = Column(Integer, default=0)
    error_message = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    sent_at = Column(DateTime)


class WebhookConfig(Base):
    __tablename__ = "webhook_configs"
    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False)  # slack, jira, github, zapier, generic
    url = Column(String(1000), nullable=False)
    secret = Column(String(255))
    events = Column(Text)  # JSON list
    enabled = Column(Boolean, default=True)
    headers = Column(Text)  # JSON dict
    created_at = Column(DateTime, default=datetime.utcnow)


class WebhookDelivery(Base):
    __tablename__ = "webhook_deliveries"
    id = Column(Integer, primary_key=True)
    webhook_id = Column(Integer, ForeignKey("webhook_configs.id", ondelete="CASCADE"), nullable=False)
    event = Column(String(100), nullable=False)
    payload = Column(Text)
    status_code = Column(Integer)
    response_body = Column(Text)
    success = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class ScheduledReport(Base):
    __tablename__ = "scheduled_reports"
    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    frequency = Column(String(50), nullable=False)  # daily, weekly, monthly
    recipients = Column(Text)  # JSON list
    format = Column(String(50), default="pdf")  # pdf, csv, excel
    config = Column(Text)  # JSON dict
    enabled = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_run_at = Column(DateTime)
    next_run_at = Column(DateTime)


class ReportTemplate(Base):
    __tablename__ = "report_templates"
    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    layout = Column(Text)  # JSON definition of widgets
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class WhiteLabelConfig(Base):
    __tablename__ = "white_label_config"
    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), unique=True, nullable=False)
    logo_url = Column(String(500))
    primary_color = Column(String(20))
    secondary_color = Column(String(20))
    footer_text = Column(Text)
    remove_branding = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class OAuthToken(Base):
    __tablename__ = "oauth_tokens"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    provider = Column(String(50), nullable=False)  # google
    provider_user_id = Column(String(255), nullable=False)
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text)
    expires_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)


class TFASecret(Base):
    __tablename__ = "tfa_secrets"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    secret = Column(String(255), nullable=False)
    enabled = Column(Boolean, default=False)
    backup_codes = Column(Text)  # JSON hashed list
    created_at = Column(DateTime, default=datetime.utcnow)


class UserDevice(Base):
    __tablename__ = "user_devices"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    device_id = Column(String(255), nullable=False)
    device_name = Column(String(255))
    is_trusted = Column(Boolean, default=False)
    trusted_until = Column(DateTime)
    last_used_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)


class Sprint(Base):
    __tablename__ = "sprints"
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    goal = Column(Text)
    start_date = Column(Date)
    end_date = Column(Date)
    status = Column(String(50), default="planned")  # planned, active, completed
    created_at = Column(DateTime, default=datetime.utcnow)


class SprintTask(Base):
    __tablename__ = "sprint_tasks"
    id = Column(Integer, primary_key=True)
    sprint_id = Column(Integer, ForeignKey("sprints.id", ondelete="CASCADE"), nullable=False)
    change_request_id = Column(Integer, ForeignKey("change_requests.id", ondelete="CASCADE"), nullable=True)
    title = Column(String(255), nullable=False)
    status = Column(String(50), default="todo")  # todo, in_progress, done
    estimated_hours = Column(Integer)
    actual_hours = Column(Integer)
    assigned_to = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class TeamAvailability(Base):
    __tablename__ = "team_availability"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    hours_available = Column(Numeric(4, 2), default=8.0)
    is_pto = Column(Boolean, default=False)
    reason = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)
    __table_args__ = (UniqueConstraint("user_id", "date"),)


class SatisfactionSurvey(Base):
    __tablename__ = "satisfaction_surveys"
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    change_request_id = Column(Integer, ForeignKey("change_requests.id", ondelete="CASCADE"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    rating = Column(Integer, nullable=False)  # 1-5
    comment = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


class ReleaseNote(Base):
    __tablename__ = "release_notes"
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    version = Column(String(50), nullable=False)
    content = Column(Text, nullable=False)  # Markdown
    published = Column(Boolean, default=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class RbacPermission(Base):
    __tablename__ = "rbac_permissions"
    id = Column(Integer, primary_key=True)
    role_name = Column(String(50), nullable=False)  # e.g., admin, project_manager, custom_role
    resource = Column(String(100), nullable=False)  # e.g., projects, users, reports
    action = Column(String(50), nullable=False)  # create, read, update, delete
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    __table_args__ = (UniqueConstraint("role_name", "resource", "action", "company_id"),)


class SlaConfig(Base):
    __tablename__ = "sla_configs"
    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    risk_level = Column(String(50), nullable=False)  # low, medium, high, critical
    max_approval_hours = Column(Integer, nullable=False)
    escalation_role = Column(String(50), default="admin")
    created_at = Column(DateTime, default=datetime.utcnow)


class IntegrationLog(Base):
    __tablename__ = "integration_logs"
    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    integration_type = Column(String(50), nullable=False)  # jira, slack
    action = Column(String(255), nullable=False)
    status = Column(String(50), nullable=False)
    details = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


class IpWhitelist(Base):
    __tablename__ = "ip_whitelists"
    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    ip_range = Column(String(50), nullable=False)  # CIDR e.g., 192.168.1.0/24
    description = Column(String(255))
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

