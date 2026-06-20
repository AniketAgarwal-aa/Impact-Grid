"""Change Requests Router — v5.0"""

import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user, require_pm_or_admin
from ..models import ChangeRequest, ImpactAnalysis, Notification, Project, Requirement, User
from ..schemas import ApprovalRequest, ChangeRequestCreate, ChangeRequestUpdate
from ..utils.audit import log_audit
from ..utils.email import send_approval_email, send_decision_email

router = APIRouter(prefix="/api/change-requests", tags=["Change Requests"])


@router.get("")
async def list_change_requests(
    status: str = Query(""),
    project_id: int = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(ChangeRequest)
    if status:
        q = q.filter(ChangeRequest.status == status)
    if project_id:
        req_ids = [
            r.id
            for r in db.query(Requirement.id)
            .filter(Requirement.project_id == project_id)
            .all()
        ]
        if req_ids:
            q = q.filter(ChangeRequest.requirement_id.in_(req_ids))
        else:
            return []
    if current_user.role == "client":
        q = q.filter(ChangeRequest.submitted_by == current_user.id)
    crs = q.order_by(ChangeRequest.created_at.desc()).limit(100).all()
    result = []
    for cr in crs:
        req = db.query(Requirement).filter(Requirement.id == cr.requirement_id).first()
        submitter = db.query(User).filter(User.id == cr.submitted_by).first()
        analysis = db.query(ImpactAnalysis).filter(ImpactAnalysis.change_request_id == cr.id).order_by(ImpactAnalysis.created_at.desc()).first()
        result.append(
            {
                "id": cr.id,
                "status": cr.status,
                "change_type": cr.change_type,
                "priority": cr.priority,
                "complexity": cr.complexity,
                "description": cr.description,
                "justification": cr.justification,
                "affected_modules": json.loads(cr.affected_modules or "[]"),
                "requirement_id": cr.requirement_id,
                "requirement_title": req.title if req else None,
                "submitted_by": cr.submitted_by,
                "submitter_name": submitter.full_name if submitter else None,
                "submitted_at": cr.submitted_at,
                "approval_comment": cr.approval_comment,
                "created_at": cr.created_at,
                "analysis_id": analysis.id if analysis else None,
            }
        )
    return result


@router.get("/{cr_id}")
async def get_change_request(
    cr_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cr = db.query(ChangeRequest).filter(ChangeRequest.id == cr_id).first()
    if not cr:
        raise HTTPException(404, "Not found")
    req = db.query(Requirement).filter(Requirement.id == cr.requirement_id).first()
    analysis = db.query(ImpactAnalysis).filter(ImpactAnalysis.change_request_id == cr_id).order_by(ImpactAnalysis.created_at.desc()).first()
    return {
        "id": cr.id,
        "status": cr.status,
        "change_type": cr.change_type,
        "priority": cr.priority,
        "complexity": cr.complexity,
        "description": cr.description,
        "justification": cr.justification,
        "expected_benefits": cr.expected_benefits,
        "risks": cr.risks,
        "affected_modules": json.loads(cr.affected_modules or "[]"),
        "requirement_id": cr.requirement_id,
        "requirement_title": req.title if req else None,
        "submitted_by": cr.submitted_by,
        "submitted_at": cr.submitted_at,
        "approval_comment": cr.approval_comment,
        "rejection_reason": cr.rejection_reason,
        "approval_date": cr.approval_date,
        "created_at": cr.created_at,
        "analysis_id": analysis.id if analysis else None,
    }


@router.post("/{cr_id}/submit")
async def submit_change_request(
    cr_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cr = db.query(ChangeRequest).filter(ChangeRequest.id == cr_id).first()
    if not cr:
        raise HTTPException(404, "Not found")
    if current_user.role != "client":
        raise HTTPException(status_code=403, detail="Only clients can submit change requests")
    if cr.status not in ("draft", "rejected", "analyzed"):
        raise HTTPException(400, f"Cannot submit from status: {cr.status}")
    cr.status = "submitted"
    cr.submitted_at = datetime.utcnow()
    db.commit()
    log_audit(db, current_user.id, "SUBMIT", "change_request", cr_id)
    return {"message": "Change request submitted for approval"}


@router.post("/{cr_id}/approve")
async def approve_change_request(
    cr_id: int,
    data: ApprovalRequest,
    current_user: User = Depends(require_pm_or_admin),
    db: Session = Depends(get_db),
):
    cr = db.query(ChangeRequest).filter(ChangeRequest.id == cr_id).first()
    if not cr:
        raise HTTPException(404, "Not found")
    if cr.status not in ("submitted", "analyzed"):
        raise HTTPException(400, "Only submitted or analyzed requests can be approved")
    cr.status = "approved"
    cr.approved_by = current_user.id
    cr.approval_comment = data.comment
    cr.approval_date = datetime.utcnow()
    db.commit()
    # Notify submitter
    if cr.submitted_by:
        submitter = db.query(User).filter(User.id == cr.submitted_by).first()
        if submitter:
            db.add(
                Notification(
                    user_id=cr.submitted_by,
                    type="approval",
                    title="Change Request Approved",
                    message=f"Your change request has been approved by {current_user.full_name}",
                    link=f"/results/{cr_id}",
                )
            )
            db.commit()
            send_decision_email(
                submitter.email,
                cr_id,
                cr.description[:100],
                "approved",
                data.comment or "",
            )
    log_audit(db, current_user.id, "APPROVE", "change_request", cr_id)
    return {"message": "Approved"}


@router.post("/{cr_id}/overrule")
async def overrule_change_request(
    cr_id: int,
    data: ApprovalRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Admin can overrule any PM approval/rejection decision."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can overrule decisions")
    cr = db.query(ChangeRequest).filter(ChangeRequest.id == cr_id).first()
    if not cr:
        raise HTTPException(404, "Not found")
    action = (data.comment or "approve").lower()
    if "reject" in action:
        cr.status = "rejected"
        cr.rejection_reason = data.comment
    else:
        cr.status = "approved"
        cr.approval_comment = data.comment
    cr.approved_by = current_user.id
    cr.approval_date = datetime.utcnow()
    db.commit()
    log_audit(db, current_user.id, "OVERRULE", "change_request", cr_id)
    return {"message": f"Decision overruled — status set to {cr.status}"}


@router.post("/{cr_id}/reject")
async def reject_change_request(
    cr_id: int,
    data: ApprovalRequest,
    current_user: User = Depends(require_pm_or_admin),
    db: Session = Depends(get_db),
):
    cr = db.query(ChangeRequest).filter(ChangeRequest.id == cr_id).first()
    if not cr:
        raise HTTPException(404, "Not found")
    if cr.status not in ("submitted", "analyzed"):
        raise HTTPException(400, "Only submitted or analyzed requests can be rejected")
    cr.status = "rejected"
    cr.approved_by = current_user.id
    cr.rejection_reason = data.comment
    cr.approval_date = datetime.utcnow()
    db.commit()
    if cr.submitted_by:
        submitter = db.query(User).filter(User.id == cr.submitted_by).first()
        if submitter:
            db.add(
                Notification(
                    user_id=cr.submitted_by,
                    type="rejection",
                    title="Change Request Rejected",
                    message=f"Your change request was rejected: {data.comment or 'No reason given'}",
                    link=f"/results/{cr_id}",
                )
            )
            db.commit()
            send_decision_email(
                submitter.email,
                cr_id,
                cr.description[:100],
                "rejected",
                data.comment or "",
            )
    log_audit(db, current_user.id, "REJECT", "change_request", cr_id)
    return {"message": "Rejected"}
