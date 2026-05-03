"""
Scheduled Reports Router
CRUD for scheduled report configurations.
"""

import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user, require_pm_or_admin
from ..models import ScheduledReport, User
from ..utils.audit import log_audit

router = APIRouter(prefix="/api/reports/scheduled", tags=["Scheduled Reports"])


@router.get("")
async def list_scheduled_reports(
    current_user: User = Depends(require_pm_or_admin),
    db: Session = Depends(get_db),
):
    company_id = current_user.company_id or 0
    reports = (
        db.query(ScheduledReport)
        .filter(ScheduledReport.company_id == company_id)
        .order_by(ScheduledReport.created_at.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "name": r.name,
            "frequency": r.frequency,
            "recipients": json.loads(r.recipients or "[]"),
            "format": r.format,
            "enabled": r.enabled,
            "last_run_at": r.last_run_at.isoformat() if r.last_run_at else None,
            "next_run_at": r.next_run_at.isoformat() if r.next_run_at else None,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in reports
    ]


@router.post("")
async def create_scheduled_report(
    data: dict,
    current_user: User = Depends(require_pm_or_admin),
    db: Session = Depends(get_db),
):
    company_id = current_user.company_id or 0
    if not data.get("name") or not data.get("frequency"):
        raise HTTPException(400, "name and frequency are required")

    report = ScheduledReport(
        company_id=company_id,
        name=data["name"],
        frequency=data["frequency"],
        recipients=json.dumps(data.get("recipients", [])),
        format=data.get("format", "pdf"),
        config=json.dumps(data.get("config", {})),
        enabled=data.get("enabled", True),
        created_by=current_user.id,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    log_audit(db, current_user.id, "CREATE", "scheduled_report", report.id)
    return {"id": report.id, "message": "Scheduled report created"}


@router.put("/{report_id}")
async def update_scheduled_report(
    report_id: int,
    data: dict,
    current_user: User = Depends(require_pm_or_admin),
    db: Session = Depends(get_db),
):
    report = db.query(ScheduledReport).filter(ScheduledReport.id == report_id).first()
    if not report:
        raise HTTPException(404, "Report not found")

    if "name" in data:
        report.name = data["name"]
    if "frequency" in data:
        report.frequency = data["frequency"]
    if "recipients" in data:
        report.recipients = json.dumps(data["recipients"])
    if "format" in data:
        report.format = data["format"]
    if "enabled" in data:
        report.enabled = data["enabled"]
    if "config" in data:
        report.config = json.dumps(data["config"])

    db.commit()
    log_audit(db, current_user.id, "UPDATE", "scheduled_report", report_id)
    return {"message": "Report updated"}


@router.delete("/{report_id}")
async def delete_scheduled_report(
    report_id: int,
    current_user: User = Depends(require_pm_or_admin),
    db: Session = Depends(get_db),
):
    report = db.query(ScheduledReport).filter(ScheduledReport.id == report_id).first()
    if not report:
        raise HTTPException(404, "Report not found")
    db.delete(report)
    db.commit()
    log_audit(db, current_user.id, "DELETE", "scheduled_report", report_id)
    return {"message": "Report deleted"}
