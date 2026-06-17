"""
ImpactSensei v5.0 - Complete Pydantic Schemas
Roles: admin | project_manager | client
"""

from datetime import date, datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, EmailStr, Field


# ============ AUTH ============
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=2)
    department: Optional[str] = None
    designation: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class VerifyEmailRequest(BaseModel):
    token: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None


# ============ COMPANIES ============
class CompanyCreate(BaseModel):
    name: str = Field(min_length=2)
    slug: Optional[str] = None
    subscription_tier: Optional[str] = "free"
    max_projects: Optional[int] = 10
    max_users: Optional[int] = 50


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    subscription_tier: Optional[str] = None
    max_projects: Optional[int] = None
    max_users: Optional[int] = None
    is_active: Optional[bool] = None


# ============ ADMIN ============
class AdminUserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str
    role: str = "client"
    company_id: Optional[int] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    # New users must verify email before login (OTP printed to logs if SMTP missing).
    is_verified: bool = False


class AdminUserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    is_active: Optional[bool] = None
    company_id: Optional[int] = None


class RoleUpdate(BaseModel):
    role: str


class SettingUpdate(BaseModel):
    value: str


# ============ PROJECTS ============
class ProjectCreate(BaseModel):
    name: str = Field(min_length=2)
    description: Optional[str] = None
    team_size: int = Field(default=5, ge=1)
    total_budget: float = Field(default=500000, ge=0)
    timeline_days: int = Field(default=30, ge=1)
    stage: str = "mid"
    currency: str = "INR"
    priority: str = "medium"
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    team_size: Optional[int] = None
    total_budget: Optional[float] = None
    timeline_days: Optional[int] = None
    stage: Optional[str] = None
    currency: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None


class ProjectClientCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2)


class ProjectMemberAdd(BaseModel):
    user_id: int
    role: str = "viewer"


# ============ REQUIREMENTS ============
class RequirementCreate(BaseModel):
    project_id: int
    title: str = Field(min_length=3)
    description: Optional[str] = None
    complexity: str = "medium"
    dependency_level: str = "moderate"
    priority: str = "medium"
    category: Optional[str] = None
    estimated_hours: Optional[int] = None


class RequirementUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    complexity: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    estimated_hours: Optional[int] = None


class DependencyCreate(BaseModel):
    depends_on_id: int
    dependency_type: str = "blocked_by"


# ============ CHANGE REQUESTS ============
class ChangeRequestCreate(BaseModel):
    requirement_id: int
    change_type: str
    priority: str = "medium"
    affected_modules: List[str] = []
    description: str
    justification: Optional[str] = None
    expected_benefits: Optional[str] = None
    risks: Optional[str] = None


class ChangeRequestUpdate(BaseModel):
    change_type: Optional[str] = None
    priority: Optional[str] = None
    affected_modules: Optional[List[str]] = None
    description: Optional[str] = None
    justification: Optional[str] = None


class ApprovalRequest(BaseModel):
    comment: Optional[str] = None

    class Config:
        extra = "allow"


# ============ ANALYSIS ============
class AnalysisRequest(BaseModel):
    project_id: Optional[int] = None
    project_name: str = "New Project"
    project_description: Optional[str] = None
    team_size: int = Field(default=5, ge=1)
    total_budget: float = Field(default=500000, ge=0)
    timeline_days: int = Field(default=30, ge=1)
    stage: str = "mid"
    currency: str = "INR"
    requirement_id: Optional[int] = None
    change_type: str = "modification"
    change_priority: str = "medium"
    affected_modules: List[str] = []
    change_description: Optional[str] = None
    justification: Optional[str] = None
    expected_benefits: Optional[str] = None


# ============ SCENARIOS ============
class ScenarioCreate(BaseModel):
    project_id: Optional[int] = None
    name: str
    description: Optional[str] = None
    analysis_id: int
    is_baseline: bool = False
    tags: List[str] = []


class ScenarioUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_baseline: Optional[bool] = None
    tags: Optional[List[str]] = None


class ScenarioCompareRequest(BaseModel):
    scenario_ids: List[int]


# ============ COMMENTS ============
class CommentCreate(BaseModel):
    entity_type: str
    entity_id: int
    content: str
    parent_comment_id: Optional[int] = None


class CommentUpdate(BaseModel):
    content: str


class ReactionCreate(BaseModel):
    reaction_type: str


# ============ TEMPLATES ============
class TemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: str = "change_request"
    content: Dict[str, Any] = {}
    variables: Optional[List[str]] = None
    is_public: bool = True


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    content: Optional[Dict[str, Any]] = None
    is_public: Optional[bool] = None


class TemplateApplyRequest(BaseModel):
    variables: Optional[Dict[str, str]] = None
