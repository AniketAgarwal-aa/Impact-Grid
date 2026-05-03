"""Audit logging utility"""

import json
from datetime import datetime

from ..models import AuditLog


def log_audit(
    db,
    user_id,
    action,
    entity_type,
    entity_id=None,
    old_values=None,
    new_values=None,
    details=None,
    ip_address=None,
    company_id=None,
):
    try:
        log = AuditLog(
            user_id=user_id,
            company_id=company_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            old_values=json.dumps(old_values) if old_values else None,
            new_values=json.dumps(new_values) if new_values else None,
            details=details,
            ip_address=ip_address,
            created_at=datetime.utcnow(),
        )
        db.add(log)
        db.commit()
    except Exception as e:
        print(f"[Audit] Log failed: {e}")
