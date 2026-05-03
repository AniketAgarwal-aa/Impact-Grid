"""
ImpactSensei - Permission Utilities
Role and permission checking helpers
"""

from sqlalchemy.orm import Session

from ..models import Project, ProjectMember


def can_access_project(
    db: Session, user_id: int, project_id: int, user_role: str
) -> bool:
    """Check if user can access a project"""
    if user_role == "admin":
        return True

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        return False

    # Owner can always access
    if project.owner_id == user_id:
        return True

    # Check membership
    member = (
        db.query(ProjectMember)
        .filter(
            ProjectMember.project_id == project_id, ProjectMember.user_id == user_id
        )
        .first()
    )

    return member is not None


def can_manage_project(
    db: Session, user_id: int, project_id: int, user_role: str
) -> bool:
    """Check if user can manage (edit/delete) a project"""
    if user_role == "admin":
        return True

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        return False

    if project.owner_id == user_id:
        return True

    if user_role == "project_manager":
        member = (
            db.query(ProjectMember)
            .filter(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == user_id,
                ProjectMember.role.in_(["lead", "reviewer"]),
            )
            .first()
        )
        return member is not None

    return False


def can_approve_change_request(user_role: str) -> bool:
    """Check if user can approve/reject change requests"""
    return user_role in ["project_manager", "admin"]
