"""
ImpactSensei v5.0 - Analysis Router
v5.0 Calculator: 6-cost, 5-time, 3-effort, 5-risk breakdowns
"""

import csv
import io
import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..calculators import ImpactCalculator
from ..database import get_db
from ..dependencies import get_current_user
from ..models import ChangeRequest, ImpactAnalysis, Project, Requirement, User
from ..schemas import AnalysisRequest
from ..utils.audit import log_audit

router = APIRouter(prefix="/api", tags=["Analysis"])


@router.post("/analyze")
async def analyze_impact(
    data: AnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Run impact analysis — clients only may submit change requests."""
    if current_user.role not in ("client", "admin"):
        raise HTTPException(status_code=403, detail="Only clients can submit change requests")
    try:
        # Resolve or create project
        project = (
            db.query(Project).filter(Project.id == data.project_id).first()
            if data.project_id
            else None
        )
        if not project:
            project = Project(
                name=data.project_name,
                description=data.project_description,
                team_size=data.team_size,
                budget=data.total_budget,
                cost_per_day=round(data.total_budget / max(1, data.timeline_days), 2),
                initial_duration=data.timeline_days,
                stage=data.stage,
                currency=data.currency,
                owner_id=current_user.id,
                company_id=current_user.company_id,
            )
            db.add(project)
            db.flush()

        auto_complexity = ImpactCalculator.auto_complexity(
            data.change_type,
            data.change_description or "",
            data.affected_modules,
            data.change_priority,
        )

        # Resolve or create requirement
        requirement = (
            db.query(Requirement).filter(Requirement.id == data.requirement_id).first()
            if data.requirement_id
            else None
        )
        if not requirement:
            requirement = Requirement(
                project_id=project.id,
                title=(data.change_description or "Change Request")[:200],
                complexity=auto_complexity,
                priority=data.change_priority,
                created_by=current_user.id,
            )
            db.add(requirement)
            db.flush()

        # Create change request record
        cr = ChangeRequest(
            requirement_id=requirement.id,
            change_type=data.change_type,
            priority=data.change_priority,
            complexity=auto_complexity,
            affected_modules=json.dumps(data.affected_modules),
            description=data.change_description or "",
            justification=data.justification,
            expected_benefits=data.expected_benefits,
            status="analyzed",
            submitted_by=current_user.id,
            submitted_at=datetime.utcnow(),
        )
        db.add(cr)
        db.flush()

        # Run v5.0 calculation
        project_ctx = {
            "team_size": data.team_size,
            "total_budget": float(data.total_budget),
            "timeline_days": data.timeline_days,
            "initial_duration": data.timeline_days,
            "stage": data.stage,
        }
        change_ctx = {
            "change_type": data.change_type,
            "priority": data.change_priority,
            "description": data.change_description or "",
            "affected_modules": data.affected_modules,
        }
        results = ImpactCalculator.calculate(project_ctx, change_ctx, data.currency)

        cost = results["cost_impact"]
        time_ = results["time_impact"]
        effort = results["effort_impact"]
        risk = results.get("risk_breakdown", {})
        cost_bd = cost.get("breakdown", {})
        time_bd = time_.get("breakdown", {})
        effort_bd = effort.get("breakdown", {})

        # Store full v5.0 analysis
        analysis = ImpactAnalysis(
            change_request_id=cr.id,
            change_size=results["change_size"],
            confidence_score=results["confidence_score"],
            # Cost
            cost_original=cost["original"],
            cost_new=cost["new"],
            cost_increase=cost["increase"],
            cost_percentage=cost["percentage"],
            cost_labor=cost_bd.get("labor", 0),
            cost_infrastructure=cost_bd.get("infrastructure", 0),
            cost_third_party=cost_bd.get("third_party", 0),
            cost_contingency=cost_bd.get("contingency", 0),
            cost_training=cost_bd.get("training", 0),
            cost_documentation=cost_bd.get("documentation", 0),
            # Time
            time_original=time_["original"],
            time_new=time_["new"],
            time_increase=time_["increase"],
            time_percentage=time_["percentage"],
            time_development=time_bd.get("development", 0),
            time_testing=time_bd.get("testing", 0),
            time_deployment=time_bd.get("deployment", 0),
            time_review=time_bd.get("review", 0),
            time_documentation=time_bd.get("documentation", 0),
            # Effort
            effort_original=effort["original"],
            effort_new=effort["new"],
            effort_increase=effort["increase"],
            effort_percentage=effort["percentage"],
            effort_senior=effort_bd.get("senior", 0),
            effort_mid=effort_bd.get("mid", 0),
            effort_junior=effort_bd.get("junior", 0),
            # Risk
            risk_level=results["risk_level"],
            risk_score=results["risk_score"],
            risk_schedule=risk.get("schedule", 0),
            risk_budget=risk.get("budget", 0),
            risk_quality=risk.get("quality", 0),
            risk_security=risk.get("security", 0),
            risk_technical=risk.get("technical", 0),
            # Quality
            quality_impact=results.get("quality_impact", 0),
            performance_impact=results.get("performance_impact", 0),
            security_impact=results.get("security_impact", 0),
            maintainability_impact=results.get("maintainability_impact", 0),
            # JSON
            recommendations=json.dumps(results.get("recommendations", [])),
            affected_components=json.dumps(results.get("affected_components", [])),
            dependency_chain=results.get("dependency_chain", ""),
            currency=data.currency,
            calculation_version="5.0",
            created_by=current_user.id,
        )
        db.add(analysis)
        db.commit()
        db.refresh(analysis)
        log_audit(
            db,
            current_user.id,
            "CREATE",
            "impact_analysis",
            analysis.id,
            details=f"v5.0 analysis for: {data.project_name}",
        )

        return {
            "id": analysis.id,
            "project_id": project.id,
            "change_request_id": cr.id,
            "timestamp": datetime.utcnow(),
            **results,
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


def _load_analysis(analysis_id: int, db: Session) -> dict:
    """Helper to serialize full analysis with all breakdowns"""
    a = db.query(ImpactAnalysis).filter(ImpactAnalysis.id == analysis_id).first()
    if not a:
        return None
    cr = db.query(ChangeRequest).filter(ChangeRequest.id == a.change_request_id).first()
    req = (
        db.query(Requirement).filter(Requirement.id == cr.requirement_id).first()
        if cr
        else None
    )
    proj = (
        db.query(Project).filter(Project.id == req.project_id).first() if req else None
    )
    rate = ImpactCalculator.get_exchange_rate(db)

    def jload(s):
        try:
            return json.loads(s) if s else []
        except:
            return []

    return {
        "id": a.id,
        "project_id": proj.id if proj else None,
        "project_name": proj.name if proj else None,
        "change_request_id": a.change_request_id,
        "change_description": cr.description if cr else None,
        "change_type": cr.change_type if cr else None,
        "change_priority": cr.priority if cr else None,
        "change_complexity": cr.complexity if cr else None,
        "affected_modules": jload(cr.affected_modules) if cr else [],
        "change_size": a.change_size,
        "confidence_score": a.confidence_score,
        "calculation_version": a.calculation_version,
        "currency": a.currency,
        "exchange_rate": rate,
        "cost_impact": {
            "original": float(a.cost_original or 0),
            "new": float(a.cost_new or 0),
            "increase": float(a.cost_increase or 0),
            "percentage": float(a.cost_percentage or 0),
            "symbol": "₹" if a.currency == "INR" else "$",
            "breakdown": {
                "labor": float(a.cost_labor or 0),
                "infrastructure": float(a.cost_infrastructure or 0),
                "third_party": float(a.cost_third_party or 0),
                "contingency": float(a.cost_contingency or 0),
                "training": float(a.cost_training or 0),
                "documentation": float(a.cost_documentation or 0),
            },
        },
        "time_impact": {
            "original": a.time_original,
            "new": a.time_new,
            "increase": a.time_increase,
            "percentage": float(a.time_percentage or 0),
            "breakdown": {
                "development": a.time_development,
                "testing": a.time_testing,
                "deployment": a.time_deployment,
                "review": a.time_review,
                "documentation": a.time_documentation,
            },
        },
        "effort_impact": {
            "original": a.effort_original,
            "new": a.effort_new,
            "increase": a.effort_increase,
            "percentage": float(a.effort_percentage or 0),
            "breakdown": {
                "senior": a.effort_senior,
                "mid": a.effort_mid,
                "junior": a.effort_junior,
            },
        },
        "risk_level": a.risk_level,
        "risk_score": a.risk_score,
        "risk_breakdown": {
            "schedule": a.risk_schedule,
            "budget": a.risk_budget,
            "quality": a.risk_quality,
            "security": a.risk_security,
            "technical": a.risk_technical,
        },
        "quality_impact": a.quality_impact,
        "performance_impact": a.performance_impact,
        "security_impact": a.security_impact,
        "maintainability_impact": a.maintainability_impact,
        "recommendations": jload(a.recommendations),
        "affected_components": jload(a.affected_components),
        "dependency_chain": a.dependency_chain or "",
        "created_at": a.created_at,
    }


@router.get("/analyses/{analysis_id}")
async def get_analysis(
    analysis_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = _load_analysis(analysis_id, db)
    if not data:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return data


@router.get("/analyses/{analysis_id}/export")
async def export_analysis_disabled():
    raise HTTPException(
        status_code=410,
        detail="Exports are disabled. Use the PDF button in the UI (browser print).",
    )
