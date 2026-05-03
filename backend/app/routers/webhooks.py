"""
Webhooks / Integrations Router
Supports: Jira, Slack, GitHub, Zapier outgoing webhooks.
"""

import json
from datetime import datetime
from typing import Any

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, HttpUrl
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user, require_pm_or_admin
from ..models import User

router = APIRouter(prefix="/api/integrations", tags=["Integrations"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class WebhookConfig(BaseModel):
    name: str
    type: str  # slack | jira | github | zapier | generic
    url: str
    secret: str | None = None
    events: list[str] = []  # e.g. ["change_request.approved", "analysis.completed"]
    enabled: bool = True
    headers: dict[str, str] = {}


class WebhookTrigger(BaseModel):
    event: str
    payload: dict[str, Any] = {}


# ── In-memory config store (production: use DB table) ───────────────────────
# Keys are company_id → list of configs
_webhook_store: dict[int, list[dict]] = {}


def _get_company_webhooks(company_id: int) -> list[dict]:
    return _webhook_store.get(company_id, [])


def _save_webhook(company_id: int, config: dict) -> dict:
    if company_id not in _webhook_store:
        _webhook_store[company_id] = []
    config["id"] = len(_webhook_store[company_id]) + 1
    config["created_at"] = datetime.utcnow().isoformat()
    _webhook_store[company_id].append(config)
    return config


# ── Delivery helper ──────────────────────────────────────────────────────────

async def _deliver_webhook(url: str, payload: dict, headers: dict = {}) -> dict:
    """Fire-and-forget HTTP POST to the webhook URL."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                url,
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "User-Agent": "ImpactSensei-Webhook/5.0",
                    **headers,
                },
            )
            return {"success": True, "status_code": resp.status_code, "url": url}
    except Exception as e:
        return {"success": False, "error": str(e), "url": url}


async def _fan_out_event(event: str, payload: dict, company_id: int) -> None:
    """Send event to all matching webhooks for the company."""
    webhooks = _get_company_webhooks(company_id)
    for wh in webhooks:
        if not wh.get("enabled"):
            continue
        if wh.get("events") and event not in wh["events"]:
            continue
        await _deliver_webhook(wh["url"], {"event": event, "data": payload}, wh.get("headers", {}))


# ── CRUD ─────────────────────────────────────────────────────────────────────

@router.get("/webhooks")
async def list_webhooks(
    current_user: User = Depends(require_pm_or_admin),
):
    """List all webhooks for the current user's company."""
    company_id = current_user.company_id or 0
    return _get_company_webhooks(company_id)


@router.post("/webhooks")
async def create_webhook(
    data: WebhookConfig,
    current_user: User = Depends(require_pm_or_admin),
):
    """Register a new webhook endpoint."""
    company_id = current_user.company_id or 0
    config = _save_webhook(company_id, data.model_dump())
    return {"id": config["id"], "message": "Webhook registered"}


@router.delete("/webhooks/{webhook_id}")
async def delete_webhook(
    webhook_id: int,
    current_user: User = Depends(require_pm_or_admin),
):
    company_id = current_user.company_id or 0
    webhooks = _webhook_store.get(company_id, [])
    _webhook_store[company_id] = [w for w in webhooks if w.get("id") != webhook_id]
    return {"message": "Deleted"}


@router.post("/webhooks/{webhook_id}/test")
async def test_webhook(
    webhook_id: int,
    current_user: User = Depends(require_pm_or_admin),
):
    """Send a test payload to the webhook."""
    company_id = current_user.company_id or 0
    wh = next(
        (w for w in _get_company_webhooks(company_id) if w.get("id") == webhook_id),
        None,
    )
    if not wh:
        raise HTTPException(404, "Webhook not found")

    result = await _deliver_webhook(
        wh["url"],
        {
            "event": "test",
            "data": {"message": "Test from ImpactSensei", "timestamp": datetime.utcnow().isoformat()},
        },
        wh.get("headers", {}),
    )
    return result


# ── Manual trigger ────────────────────────────────────────────────────────────

@router.post("/trigger/{event}")
async def trigger_event(
    event: str,
    data: WebhookTrigger,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
):
    """Manually trigger a webhook event (Zapier-style)."""
    company_id = current_user.company_id or 0
    background_tasks.add_task(_fan_out_event, event, data.payload, company_id)
    return {"queued": True, "event": event}


# ── Incoming receiver endpoints ────────────────────────────────────────────────

@router.post("/jira/webhook")
async def jira_webhook(payload: dict):
    """Receive Jira events (issue updated, comment added, etc.)"""
    event_type = payload.get("webhookEvent", "unknown")
    issue = payload.get("issue", {})
    print(f"[Jira Webhook] Event: {event_type} Issue: {issue.get('key')}")
    return {"received": True, "event": event_type}


@router.post("/slack/webhook")
async def slack_webhook(payload: dict):
    """Receive Slack events (challenge, message, etc.)"""
    # Slack URL verification challenge
    if "challenge" in payload:
        return {"challenge": payload["challenge"]}
    print(f"[Slack Webhook] Event: {payload.get('event', {}).get('type')}")
    return {"ok": True}


@router.post("/github/webhook")
async def github_webhook(payload: dict):
    """Receive GitHub events (PR opened, closed, merged)."""
    action = payload.get("action")
    pr = payload.get("pull_request", {})
    print(f"[GitHub Webhook] Action: {action}, PR: {pr.get('title')}")
    return {"received": True, "action": action}


# ── Slack notifier helper (call from other routers) ──────────────────────────

async def send_slack_notification(webhook_url: str, message: str, color: str = "#6366f1") -> bool:
    """Helper to send a formatted Slack message."""
    payload = {
        "attachments": [
            {
                "color": color,
                "text": message,
                "footer": "ImpactSensei",
                "ts": int(datetime.utcnow().timestamp()),
            }
        ]
    }
    result = await _deliver_webhook(webhook_url, payload)
    return result.get("success", False)
