"""
Advanced Analytics Router
- Historical trend predictions (linear regression)
- Sprint risk forecasting
- Anomaly detection (Z-score)
- Sentiment analysis (VADER)
- Usage analytics
"""

import math
from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user, require_pm_or_admin
from ..models import (
    AuditLog,
    ChangeRequest,
    Comment,
    ImpactAnalysis,
    Project,
    Requirement,
    User,
)

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


# ── Linear regression helper ──────────────────────────────────────────────────

def _linear_regression(x: list[float], y: list[float]) -> tuple[float, float]:
    """Returns (slope, intercept)."""
    n = len(x)
    if n < 2:
        return 0.0, y[0] if y else 0.0
    sx = sum(x)
    sy = sum(y)
    sxy = sum(xi * yi for xi, yi in zip(x, y))
    sx2 = sum(xi ** 2 for xi in x)
    denom = n * sx2 - sx ** 2
    if denom == 0:
        return 0.0, sy / n
    slope = (n * sxy - sx * sy) / denom
    intercept = (sy - slope * sx) / n
    return slope, intercept


def _z_scores(values: list[float]) -> list[float]:
    if len(values) < 2:
        return [0.0] * len(values)
    mean = sum(values) / len(values)
    variance = sum((v - mean) ** 2 for v in values) / len(values)
    std = math.sqrt(variance) if variance > 0 else 1.0
    return [(v - mean) / std for v in values]


# ── Historical Trend Predictions ──────────────────────────────────────────────

@router.get("/predictions")
async def historical_predictions(
    project_id: int | None = Query(None),
    weeks: int = Query(4, ge=1, le=12),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Linear regression on past risk scores → forecast next N weeks."""
    q = db.query(ImpactAnalysis).filter(ImpactAnalysis.risk_score.isnot(None))
    if project_id:
        # Filter by project via change_request → requirement → project
        cr_ids = (
            db.query(ChangeRequest.id)
            .join(Requirement, Requirement.id == ChangeRequest.requirement_id)
            .filter(Requirement.project_id == project_id)
            .subquery()
        )
        q = q.filter(ImpactAnalysis.change_request_id.in_(cr_ids))

    analyses = q.order_by(ImpactAnalysis.created_at).all()
    if not analyses:
        return {"history": [], "forecast": [], "message": "No data yet"}

    # Group by week
    weekly: dict[int, list[int]] = {}
    base = analyses[0].created_at or datetime.utcnow()
    for a in analyses:
        week_num = max(0, ((a.created_at or datetime.utcnow()) - base).days // 7)
        weekly.setdefault(week_num, []).append(int(a.risk_score or 0))

    weeks_x = sorted(weekly.keys())
    weeks_y = [sum(weekly[w]) / len(weekly[w]) for w in weeks_x]

    slope, intercept = _linear_regression([float(x) for x in weeks_x], weeks_y)

    history = [
        {
            "week": i,
            "avg_risk": round(weeks_y[i], 1),
            "date": (base + timedelta(weeks=weeks_x[i])).strftime("%Y-%m-%d"),
        }
        for i in range(len(weeks_x))
    ]

    last_week = weeks_x[-1] if weeks_x else 0
    forecast = []
    for fw in range(1, weeks + 1):
        predicted = round(slope * (last_week + fw) + intercept, 1)
        predicted = max(0.0, min(100.0, predicted))
        confidence = max(60, 95 - fw * 5)
        forecast.append(
            {
                "week": last_week + fw,
                "predicted_risk": predicted,
                "confidence": confidence,
                "date": (base + timedelta(weeks=last_week + fw)).strftime("%Y-%m-%d"),
                "trend": "rising" if slope > 1 else "falling" if slope < -1 else "stable",
            }
        )

    return {
        "history": history,
        "forecast": forecast,
        "slope": round(slope, 4),
        "trend": "rising" if slope > 1 else "falling" if slope < -1 else "stable",
    }


# ── Sprint Risk Forecasting ───────────────────────────────────────────────────

@router.get("/forecast/sprints")
async def sprint_forecast(
    project_id: int | None = Query(None),
    sprints: int = Query(4, ge=1, le=8),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Forecast risk for upcoming 2-week sprints."""
    q = db.query(ImpactAnalysis)
    if project_id:
        cr_ids = (
            db.query(ChangeRequest.id)
            .join(Requirement, Requirement.id == ChangeRequest.requirement_id)
            .filter(Requirement.project_id == project_id)
            .subquery()
        )
        q = q.filter(ImpactAnalysis.change_request_id.in_(cr_ids))

    recent = q.order_by(ImpactAnalysis.created_at.desc()).limit(20).all()
    avg_risk = (
        sum(int(a.risk_score or 0) for a in recent) / len(recent) if recent else 50
    )
    freq = len(recent) / max(1, (sprints * 2))  # changes per week estimate

    result = []
    for s in range(1, sprints + 1):
        # Simple decay model: risk moderates over time unless frequency is high
        predicted = round(avg_risk * (1 + (freq - 1) * 0.05 * s), 1)
        predicted = max(0.0, min(100.0, predicted))
        level = (
            "critical" if predicted >= 75
            else "high" if predicted >= 55
            else "medium" if predicted >= 35
            else "low"
        )
        sprint_start = datetime.utcnow() + timedelta(weeks=(s - 1) * 2)
        result.append(
            {
                "sprint": s,
                "predicted_risk": predicted,
                "risk_level": level,
                "start_date": sprint_start.strftime("%Y-%m-%d"),
                "end_date": (sprint_start + timedelta(weeks=2)).strftime("%Y-%m-%d"),
                "estimated_changes": round(freq * 2),
            }
        )

    return {"sprints": result, "base_avg_risk": round(avg_risk, 1)}


# ── Anomaly Detection ─────────────────────────────────────────────────────────

@router.get("/anomalies")
async def detect_anomalies(
    project_id: int | None = Query(None),
    threshold: float = Query(2.0, description="Z-score threshold"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Detect cost spikes, time overruns, and risk surges using Z-score."""
    q = db.query(ImpactAnalysis)
    if project_id:
        cr_ids = (
            db.query(ChangeRequest.id)
            .join(Requirement, Requirement.id == ChangeRequest.requirement_id)
            .filter(Requirement.project_id == project_id)
            .subquery()
        )
        q = q.filter(ImpactAnalysis.change_request_id.in_(cr_ids))

    analyses = q.order_by(ImpactAnalysis.created_at).all()
    if len(analyses) < 3:
        return {"anomalies": [], "message": "Need at least 3 analyses for detection"}

    costs = [float(a.cost_increase or 0) for a in analyses]
    times = [float(a.time_increase or 0) for a in analyses]
    risks = [float(a.risk_score or 0) for a in analyses]

    cost_z = _z_scores(costs)
    time_z = _z_scores(times)
    risk_z = _z_scores(risks)

    anomalies = []
    for i, a in enumerate(analyses):
        detected: list[dict[str, Any]] = []
        if abs(cost_z[i]) >= threshold:
            detected.append(
                {"type": "cost_spike", "value": costs[i], "z_score": round(cost_z[i], 2)}
            )
        if abs(time_z[i]) >= threshold:
            detected.append(
                {"type": "time_overrun", "value": times[i], "z_score": round(time_z[i], 2)}
            )
        if abs(risk_z[i]) >= threshold:
            detected.append(
                {"type": "risk_surge", "value": risks[i], "z_score": round(risk_z[i], 2)}
            )

        if detected:
            anomalies.append(
                {
                    "analysis_id": a.id,
                    "created_at": a.created_at.isoformat() if a.created_at else None,
                    "change_size": a.change_size,
                    "risk_level": a.risk_level,
                    "anomalies": detected,
                    "severity": (
                        "critical"
                        if any(abs(d["z_score"]) >= 3 for d in detected)
                        else "warning"
                    ),
                }
            )

    return {
        "anomalies": anomalies,
        "total_analyzed": len(analyses),
        "anomaly_rate": round(len(anomalies) / len(analyses) * 100, 1),
    }


# ── Sentiment Analysis (VADER) ────────────────────────────────────────────────

@router.post("/sentiment")
async def analyze_sentiment(
    payload: dict,
    current_user: User = Depends(get_current_user),
):
    """Analyze sentiment of provided text using VADER."""
    try:
        from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

        analyzer = SentimentIntensityAnalyzer()
    except ImportError:
        return {"error": "vaderSentiment not installed", "sentiment": "neutral", "scores": {}}

    text = payload.get("text", "")
    if not text:
        return {"sentiment": "neutral", "scores": {}, "compound": 0}

    scores = analyzer.polarity_scores(text)
    compound = scores["compound"]
    sentiment = "positive" if compound >= 0.05 else "negative" if compound <= -0.05 else "neutral"

    return {
        "sentiment": sentiment,
        "compound": round(compound, 4),
        "scores": {
            "positive": round(scores["pos"], 3),
            "negative": round(scores["neg"], 3),
            "neutral": round(scores["neu"], 3),
        },
        "label": "😊 Positive" if sentiment == "positive" else "😟 Negative" if sentiment == "negative" else "😐 Neutral",
    }


@router.get("/sentiment/thread/{entity_type}/{entity_id}")
async def thread_sentiment(
    entity_type: str,
    entity_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Analyze sentiment trend across all comments on an entity."""
    try:
        from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
        analyzer = SentimentIntensityAnalyzer()
    except ImportError:
        return {"error": "vaderSentiment not installed"}

    comments = (
        db.query(Comment)
        .filter(Comment.entity_type == entity_type, Comment.entity_id == entity_id)
        .order_by(Comment.created_at)
        .all()
    )

    if not comments:
        return {"comments": [], "overall": "neutral", "trend": "stable"}

    results = []
    for c in comments:
        scores = analyzer.polarity_scores(c.content or "")
        compound = scores["compound"]
        results.append(
            {
                "comment_id": c.id,
                "created_at": c.created_at.isoformat() if c.created_at else None,
                "compound": round(compound, 3),
                "sentiment": "positive" if compound >= 0.05 else "negative" if compound <= -0.05 else "neutral",
            }
        )

    avg_compound = sum(r["compound"] for r in results) / len(results)
    overall = "positive" if avg_compound >= 0.05 else "negative" if avg_compound <= -0.05 else "neutral"

    # Detect trend
    if len(results) >= 3:
        first_half = sum(r["compound"] for r in results[: len(results) // 2]) / (len(results) // 2)
        second_half = sum(r["compound"] for r in results[len(results) // 2:]) / (len(results) - len(results) // 2)
        trend = "improving" if second_half > first_half + 0.1 else "declining" if second_half < first_half - 0.1 else "stable"
    else:
        trend = "stable"

    return {"comments": results, "overall": overall, "avg_compound": round(avg_compound, 3), "trend": trend}


# ── Usage Analytics ────────────────────────────────────────────────────────────

@router.get("/usage")
async def usage_analytics(
    period: str = Query("month", regex="^(week|month|quarter)$"),
    current_user: User = Depends(require_pm_or_admin),
    db: Session = Depends(get_db),
):
    """Dashboard: DAU, MAU, feature usage."""
    cutoff = {
        "week": datetime.utcnow() - timedelta(weeks=1),
        "month": datetime.utcnow() - timedelta(days=30),
        "quarter": datetime.utcnow() - timedelta(days=90),
    }[period]

    total_users = db.query(func.count(User.id)).scalar() or 0
    active_users = (
        db.query(func.count(User.id)).filter(User.last_login >= cutoff).scalar() or 0
    )
    total_analyses = (
        db.query(func.count(ImpactAnalysis.id))
        .filter(ImpactAnalysis.created_at >= cutoff)
        .scalar() or 0
    )
    total_projects = db.query(func.count(Project.id)).scalar() or 0
    total_crs = (
        db.query(func.count(ChangeRequest.id))
        .filter(ChangeRequest.created_at >= cutoff)
        .scalar() or 0
    )
    total_comments = (
        db.query(func.count(Comment.id)).filter(Comment.created_at >= cutoff).scalar() or 0
    )

    # Audit log actions breakdown
    audit_counts = (
        db.query(AuditLog.action, func.count(AuditLog.id))
        .filter(AuditLog.created_at >= cutoff)
        .group_by(AuditLog.action)
        .all()
    )

    return {
        "period": period,
        "users": {"total": total_users, "active": active_users, "retention_pct": round(active_users / max(total_users, 1) * 100, 1)},
        "activity": {
            "analyses_run": total_analyses,
            "projects": total_projects,
            "change_requests": total_crs,
            "comments": total_comments,
        },
        "actions_breakdown": {action: count for action, count in audit_counts},
    }
