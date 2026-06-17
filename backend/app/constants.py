"""Impact Grid — shared constants"""

SUPER_ADMIN_EMAILS = frozenset(
    {
        "admin1@impactstudio.com",
        "admin2@impactstudio.com",
    }
)


def is_super_admin(email: str | None) -> bool:
    return (email or "").lower() in SUPER_ADMIN_EMAILS


def is_protected_admin(email: str | None) -> bool:
    return is_super_admin(email)
