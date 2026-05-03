"""Scenarios router"""

import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import get_current_user
from ..models import ImpactAnalysis, Project, Scenario, User
from ..schemas import ScenarioCompareRequest, ScenarioCreate, ScenarioUpdate
from ..utils.audit import log_audit

router = APIRouter(prefix="/api/scenarios", tags=["Scenarios"])


def _serialize(s: Scenario, db: Session) -> dict:
    a = db.query(ImpactAnalysis).filter(ImpactAnalysis.id == s.analysis_id).first()
    p = (
        db.query(Project).filter(Project.id == s.project_id).first()
        if s.project_id
        else None
    )
    return {
        "id": s.id,
        "name": s.name,
        "description": s.description,
        "project_id": s.project_id,
        "project_name": p.name if p else None,
        "analysis_id": s.analysis_id,
        "is_baseline": s.is_baseline,
        "tags": json.loads(s.tags or "[]"),
        "created_at": s.created_at,
        "analysis_summary": (
            {
                "change_size": a.change_size,
                "risk_level": a.risk_level,
                "risk_score": a.risk_score,
                "cost_increase": float(a.cost_increase or 0),
                "time_increase": a.time_increase,
                "currency": a.currency,
            }
            if a
            else None
        ),
    }


@router.get("")
async def list_scenarios(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    q = db.query(Scenario)
    if current_user.role == "client":
        q = q.filter(Scenario.created_by == current_user.id)
    return [_serialize(s, db) for s in q.order_by(Scenario.created_at.desc()).all()]


@router.post("")
async def create_scenario(
    data: ScenarioCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = Scenario(
        project_id=data.project_id,
        name=data.name,
        description=data.description,
        analysis_id=data.analysis_id,
        is_baseline=data.is_baseline,
        tags=json.dumps(data.tags),
        created_by=current_user.id,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    log_audit(db, current_user.id, "CREATE", "scenario", s.id)
    return {"id": s.id, "message": "Scenario saved"}


@router.put("/{scenario_id}")
async def update_scenario(
    scenario_id: int,
    data: ScenarioUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = db.query(Scenario).filter(Scenario.id == scenario_id).first()
    if not s:
        raise HTTPException(404, "Not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(s, k, json.dumps(v) if k == "tags" else v)
    s.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Updated"}


@router.delete("/{scenario_id}")
async def delete_scenario(
    scenario_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = db.query(Scenario).filter(Scenario.id == scenario_id).first()
    if not s:
        raise HTTPException(404, "Not found")
    db.delete(s)
    db.commit()
    return {"message": "Deleted"}


@router.post("/compare")
async def compare_scenarios(
    data: ScenarioCompareRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if len(data.scenario_ids) < 2:
        raise HTTPException(400, "Need at least 2 scenarios")
    results = []
    for sid in data.scenario_ids:
        s = db.query(Scenario).filter(Scenario.id == sid).first()
        if not s:
            continue
        a = db.query(ImpactAnalysis).filter(ImpactAnalysis.id == s.analysis_id).first()
        if not a:
            continue
        results.append(
            {
                "scenario_id": s.id,
                "scenario_name": s.name,
                "change_size": a.change_size,
                "currency": a.currency,
                "cost": {
                    "original": float(a.cost_original or 0),
                    "new": float(a.cost_new or 0),
                    "increase": float(a.cost_increase or 0),
                    "percentage": float(a.cost_percentage or 0),
                },
                "time": {
                    "original": a.time_original,
                    "new": a.time_new,
                    "increase": a.time_increase,
                    "percentage": float(a.time_percentage or 0),
                },
                "effort": {
                    "original": a.effort_original,
                    "new": a.effort_new,
                    "increase": a.effort_increase,
                },
                "risk": {"score": a.risk_score, "level": a.risk_level},
            }
        )
    return {"scenarios": results, "count": len(results)}
