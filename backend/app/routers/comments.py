"""Comments router"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user
from ..models import Comment, CommentReaction, User
from ..utils.mentions import notify_mentions
from ..schemas import CommentCreate, CommentUpdate, ReactionCreate

router = APIRouter(prefix="/api/comments", tags=["Comments"])


@router.get("/{entity_type}/{entity_id}")
async def get_comments(
    entity_type: str,
    entity_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    comments = (
        db.query(Comment)
        .filter(
            Comment.entity_type == entity_type,
            Comment.entity_id == entity_id,
            Comment.parent_comment_id == None,
        )
        .order_by(Comment.created_at)
        .all()
    )

    def serialize(c):
        replies = db.query(Comment).filter(Comment.parent_comment_id == c.id).all()
        reactions = (
            db.query(CommentReaction).filter(CommentReaction.comment_id == c.id).all()
        )
        return {
            "id": c.id,
            "user_id": c.user_id,
            "user_name": c.user_name,
            "user_role": c.user_role,
            "content": c.content,
            "is_edited": c.is_edited,
            "created_at": c.created_at,
            "replies": [serialize(r) for r in replies],
            "reactions": [{"type": r.reaction_type} for r in reactions],
        }

    return [serialize(c) for c in comments]


@router.post("")
async def add_comment(
    data: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    c = Comment(
        entity_type=data.entity_type,
        entity_id=data.entity_id,
        user_id=current_user.id,
        user_name=current_user.full_name,
        user_role=current_user.role,
        content=data.content,
        parent_comment_id=data.parent_comment_id,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    link = f"/projects/{data.entity_id}" if data.entity_type == "project" else f"/results/{data.entity_id}"
    notify_mentions(
        db,
        content=data.content,
        author=current_user,
        entity_type=data.entity_type,
        entity_id=data.entity_id,
        link=link,
    )
    return {"id": c.id, "message": "Comment added"}


@router.put("/{comment_id}")
async def update_comment(
    comment_id: int,
    data: CommentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    c = db.query(Comment).filter(Comment.id == comment_id).first()
    if not c:
        raise HTTPException(404, "Not found")
    if c.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(403, "Forbidden")
    c.content = data.content
    c.is_edited = True
    c.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Updated"}


@router.delete("/{comment_id}")
async def delete_comment(
    comment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    c = db.query(Comment).filter(Comment.id == comment_id).first()
    if not c:
        raise HTTPException(404, "Not found")
    if c.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(403, "Forbidden")
    db.delete(c)
    db.commit()
    return {"message": "Deleted"}


@router.post("/{comment_id}/react")
async def react(
    comment_id: int,
    data: ReactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = (
        db.query(CommentReaction)
        .filter(
            CommentReaction.comment_id == comment_id,
            CommentReaction.user_id == current_user.id,
        )
        .first()
    )
    if existing:
        db.delete(existing)
        db.commit()
        return {"message": "Reaction removed"}
    db.add(
        CommentReaction(
            comment_id=comment_id,
            user_id=current_user.id,
            reaction_type=data.reaction_type,
        )
    )
    db.commit()
    return {"message": "Reaction added"}
