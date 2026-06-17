"""@mention parsing and notification helpers"""

import re
from typing import List

from sqlalchemy.orm import Session

from ..models import Notification, User
from .email import _send

MENTION_PATTERN = re.compile(r"@([\w.+-]+@[\w.-]+\.\w+|[\w.-]+)")


def extract_mentions(content: str) -> List[str]:
    """Extract @mentions from comment content (email or name fragments)."""
    if not content:
        return []
    return list(dict.fromkeys(MENTION_PATTERN.findall(content)))


def resolve_mentioned_users(db: Session, mentions: List[str], project_id: int | None = None) -> List[User]:
    """Resolve mention strings to User records."""
    users: List[User] = []
    seen = set()
    for mention in mentions:
        mention = mention.strip()
        if "@" in mention:
            user = db.query(User).filter(User.email.ilike(mention)).first()
        else:
            user = (
                db.query(User)
                .filter(User.full_name.ilike(f"%{mention}%"))
                .first()
            )
        if user and user.id not in seen:
            users.append(user)
            seen.add(user.id)
    return users


def notify_mentions(
    db: Session,
    *,
    content: str,
    author: User,
    entity_type: str,
    entity_id: int,
    link: str,
) -> None:
    mentions = extract_mentions(content)
    if not mentions:
        return
    for user in resolve_mentioned_users(db, mentions):
        if user.id == author.id:
            continue
        db.add(
            Notification(
                user_id=user.id,
                type="mention",
                title=f"{author.full_name} mentioned you",
                message=content[:200],
                link=link,
            )
        )
        _send(
            user.email,
            f"You were mentioned in a discussion — Impact Grid",
            f"<p><strong>{author.full_name}</strong> mentioned you:</p>"
            f"<blockquote>{content[:500]}</blockquote>"
            f"<p><a href='{link}'>View discussion</a></p>",
        )
    db.commit()
