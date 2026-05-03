"""
ImpactSensei v5.0 - Rule-Based Impact Calculator
Pure logic engine - NO external APIs for core calculations
"""

import math
from typing import Dict, List, Optional


class ImpactCalculator:
    """v5.0 - Complete enterprise impact engine with detailed breakdowns"""

    # ============ RULE-BASED WEIGHTS ============
    COMPLEXITY_WEIGHTS = {"low": 1, "medium": 2, "high": 3, "very_high": 4}
    CHANGE_TYPE_WEIGHTS = {
        "addition": 1.3,
        "modification": 1.0,
        "removal": 0.8,
        "refactor": 1.1,
        "optimization": 0.9,
    }
    PRIORITY_WEIGHTS = {
        "low": 0.8,
        "medium": 1.0,
        "high": 1.4,
        "critical": 1.8,
        "emergency": 2.0,
    }
    STAGE_WEIGHTS = {"early": 0.7, "mid": 1.0, "late": 1.5}

    MODULE_COMPLEXITY = {
        "authentication": 1.4,
        "database": 1.6,
        "api": 1.3,
        "frontend": 1.0,
        "backend": 1.3,
        "reports": 0.9,
        "notification": 0.8,
        "payment": 1.7,
        "search": 1.1,
        "analytics": 1.2,
        "mobile": 1.3,
        "security": 1.5,
        "infrastructure": 1.4,
        "devops": 1.2,
        "testing": 0.9,
        "integration": 1.2,
        "documentation": 0.7,
        "auth": 1.4,
    }

    COMPONENT_MAP = {
        "authentication": {
            "name": "User Authentication Service",
            "type": "Backend API",
            "impact_level": "Critical",
            "hours": 40,
            "description": "MFA implementation, token validation, session management",
        },
        "auth": {
            "name": "Auth Service",
            "type": "Backend API",
            "impact_level": "Critical",
            "hours": 36,
            "description": "MFA implementation, token validation, session management",
        },
        "database": {
            "name": "Primary Database",
            "type": "Infrastructure",
            "impact_level": "High",
            "hours": 24,
            "description": "Schema migration, backup, performance optimization",
        },
        "api": {
            "name": "API Gateway",
            "type": "Backend API",
            "impact_level": "High",
            "hours": 32,
            "description": "Endpoint changes, rate limiting, authentication",
        },
        "frontend": {
            "name": "Web Application",
            "type": "Frontend UI",
            "impact_level": "Medium",
            "hours": 16,
            "description": "UI components, user flows, responsive design",
        },
        "backend": {
            "name": "Core Business Logic",
            "type": "Backend Service",
            "impact_level": "High",
            "hours": 40,
            "description": "Business rules, service layer, integrations",
        },
        "reports": {
            "name": "Reporting Engine",
            "type": "Data Service",
            "impact_level": "Low",
            "hours": 8,
            "description": "Report generation, data aggregation, exports",
        },
        "payment": {
            "name": "Payment Gateway",
            "type": "Third-party Integration",
            "impact_level": "Critical",
            "hours": 48,
            "description": "Payment processing, refunds, webhooks",
        },
        "security": {
            "name": "Security Layer",
            "type": "Infrastructure",
            "impact_level": "Critical",
            "hours": 56,
            "description": "Encryption, compliance, audit logging",
        },
        "notification": {
            "name": "Notification Service",
            "type": "Backend API",
            "impact_level": "Low",
            "hours": 12,
            "description": "Email, SMS, push notifications",
        },
        "search": {
            "name": "Search Engine",
            "type": "Infrastructure",
            "impact_level": "Medium",
            "hours": 20,
            "description": "Indexing, search queries, relevance",
        },
        "analytics": {
            "name": "Analytics Pipeline",
            "type": "Data Service",
            "impact_level": "Medium",
            "hours": 24,
            "description": "Data processing pipelines",
        },
        "mobile": {
            "name": "Mobile Application",
            "type": "Frontend UI",
            "impact_level": "Medium",
            "hours": 32,
            "description": "Mobile application updates",
        },
        "infrastructure": {
            "name": "Infrastructure Layer",
            "type": "Infrastructure",
            "impact_level": "High",
            "hours": 28,
            "description": "Infrastructure updates",
        },
        "devops": {
            "name": "CI/CD Pipeline",
            "type": "Infrastructure",
            "impact_level": "Medium",
            "hours": 20,
            "description": "DevOps changes",
        },
        "integration": {
            "name": "Integration Hub",
            "type": "Backend API",
            "impact_level": "High",
            "hours": 36,
            "description": "Integration logic changes",
        },
    }

    DEPENDENCY_CHAIN_MAP = {
        "authentication": "database",
        "auth": "database",
        "database": "api",
        "api": "backend",
        "backend": "frontend",
        "frontend": "reports",
        "security": "authentication",
        "payment": "backend",
        "notification": "backend",
        "analytics": "database",
        "search": "database",
        "mobile": "api",
    }

    @classmethod
    def calculate(cls, project: Dict, change: Dict, currency: str = "INR") -> Dict:
        """Main entry point - pure rule-based calculation"""
        base_score = cls._base_score(project, change)
        module_factor = cls._module_factor(change.get("affected_modules", []))
        impact_score = base_score * module_factor
        change_size, multiplier = cls._change_size(impact_score)
        impacts = cls._detailed_impacts(project, change, multiplier, impact_score)
        risk = cls._detailed_risk(project, change, impact_score)
        components = cls._affected_components(change.get("affected_modules", []))
        chain = cls._dependency_chain(change.get("affected_modules", []))
        recommendations = cls._recommendations(risk, change)
        confidence = cls._confidence(impact_score)

        return {
            "change_size": change_size,
            "confidence_score": confidence,
            "cost_impact": impacts["cost"],
            "time_impact": impacts["time"],
            "effort_impact": impacts["effort"],
            "risk_level": risk["level"],
            "risk_score": risk["score"],
            "risk_breakdown": risk["breakdown"],
            "quality_impact": cls._quality_impact(impact_score),
            "performance_impact": cls._performance_impact(change),
            "security_impact": cls._security_impact(change),
            "maintainability_impact": cls._maintainability_impact(impact_score),
            "recommendations": recommendations,
            "affected_components": components,
            "dependency_chain": chain,
            "currency": currency,
        }

    @classmethod
    def _base_score(cls, project: Dict, change: Dict) -> float:
        complexity = cls.COMPLEXITY_WEIGHTS.get(change.get("complexity", "medium"), 2)
        change_type = cls.CHANGE_TYPE_WEIGHTS.get(
            change.get("change_type", "modification"), 1.0
        )
        priority = cls.PRIORITY_WEIGHTS.get(change.get("priority", "medium"), 1.0)
        stage = cls.STAGE_WEIGHTS.get(project.get("stage", "mid"), 1.0)
        return round(
            (complexity * 0.4)
            + (change_type * 0.25)
            + (priority * 0.2)
            + (stage * 0.15),
            2,
        )

    @classmethod
    def _module_factor(cls, modules: List[str]) -> float:
        if not modules:
            return 1.0
        weights = [cls.MODULE_COMPLEXITY.get(m.lower(), 1.0) for m in modules]
        avg = sum(weights) / len(weights)
        count_factor = 1 + (len(modules) * 0.1)
        return round(avg * count_factor, 2)

    @classmethod
    def _change_size(cls, score: float):
        if score < 1.5:
            return "Small", 1.05
        elif score < 2.5:
            return "Medium", 1.15
        elif score < 3.5:
            return "Large", 1.30
        else:
            return "Very Large", 1.50

    @classmethod
    def _detailed_impacts(
        cls, project: Dict, change: Dict, multiplier: float, impact_score: float
    ) -> Dict:
        team_size = max(1, project.get("team_size", 5))
        cost_per_day = float(project.get("cost_per_day", 5000))
        initial_duration = max(1, project.get("initial_duration", 60))
        current_cost = cost_per_day * initial_duration

        complexity_v = cls.COMPLEXITY_WEIGHTS.get(change.get("complexity", "medium"), 2)
        base_days = 8 * (complexity_v / 2)
        # Calibrated so typical enterprise change requests land in ~10–20 extra days
        # (previously *10 blew up durations vs baseline timelines).
        time_impact = max(
            1,
            round(base_days * (multiplier - 1) * (team_size / 5) * 2.0),
        )

        daily_rate = cost_per_day
        cost_labor = time_impact * daily_rate
        cost_infra = cost_labor * 0.15
        cost_third = cost_labor * 0.10 if change.get("affected_modules") else 0
        cost_contingency = cost_labor * (0.20 if impact_score > 2.5 else 0.10)
        cost_training = cost_labor * 0.05 if impact_score > 2.0 else 0
        cost_docs = cost_labor * 0.03
        total_cost = (
            cost_labor
            + cost_infra
            + cost_third
            + cost_contingency
            + cost_training
            + cost_docs
        )

        effort_total = max(1, time_impact * team_size)
        effort_senior = int(effort_total * 0.30)
        effort_mid = int(effort_total * 0.50)
        effort_junior = effort_total - effort_senior - effort_mid

        return {
            "cost": {
                "original": round(current_cost, 2),
                "new": round(current_cost + total_cost, 2),
                "increase": round(total_cost, 2),
                "percentage": round(
                    (total_cost / current_cost * 100) if current_cost > 0 else 0, 2
                ),
                "breakdown": {
                    "labor": round(cost_labor, 2),
                    "infrastructure": round(cost_infra, 2),
                    "third_party": round(cost_third, 2),
                    "contingency": round(cost_contingency, 2),
                    "training": round(cost_training, 2),
                    "documentation": round(cost_docs, 2),
                },
            },
            "time": {
                "original": initial_duration,
                "new": initial_duration + time_impact,
                "increase": time_impact,
                "percentage": round((time_impact / initial_duration * 100), 2),
                "breakdown": {
                    "development": int(time_impact * 0.50),
                    "testing": int(time_impact * 0.25),
                    "deployment": int(time_impact * 0.15),
                    "review": int(time_impact * 0.07),
                    "documentation": max(1, int(time_impact * 0.03)),
                },
            },
            "effort": {
                "original": initial_duration * team_size,
                "new": (initial_duration + time_impact) * team_size,
                "increase": effort_total,
                "percentage": round(
                    (
                        (effort_total / (initial_duration * team_size) * 100)
                        if initial_duration * team_size > 0
                        else 0
                    ),
                    2,
                ),
                "breakdown": {
                    "senior": effort_senior,
                    "mid": effort_mid,
                    "junior": effort_junior,
                },
            },
        }

    @classmethod
    def _detailed_risk(cls, project: Dict, change: Dict, impact_score: float) -> Dict:
        priority_v = cls.PRIORITY_WEIGHTS.get(change.get("priority", "medium"), 1.0)
        stage_v = cls.STAGE_WEIGHTS.get(project.get("stage", "mid"), 1.0)
        complexity_v = cls.COMPLEXITY_WEIGHTS.get(change.get("complexity", "medium"), 2)
        modules = change.get("affected_modules", [])

        r_schedule = min(int(impact_score * 15 + stage_v * 15), 100)
        r_budget = min(int(impact_score * 12 + priority_v * 20), 100)
        r_quality = min(int(complexity_v * 15 + len(modules) * 5), 100)
        r_security = (
            60
            if any(
                m.lower() in ["security", "authentication", "auth", "payment"]
                for m in modules
            )
            else min(int(10 + impact_score * 5), 100)
        )
        r_technical = min(int(complexity_v * 20), 100)

        overall = int(
            r_schedule * 0.25
            + r_budget * 0.25
            + r_quality * 0.20
            + r_security * 0.15
            + r_technical * 0.15
        )

        level = (
            "low"
            if overall < 30
            else "medium" if overall < 60 else "high" if overall < 80 else "critical"
        )
        return {
            "score": overall,
            "level": level,
            "breakdown": {
                "schedule": r_schedule,
                "budget": r_budget,
                "quality": r_quality,
                "security": r_security,
                "technical": r_technical,
            },
        }

    @classmethod
    def _quality_impact(cls, score: float) -> int:
        return min(int(score * 20), 100)

    @classmethod
    def _performance_impact(cls, change: Dict) -> int:
        modules = [m.lower() for m in change.get("affected_modules", [])]
        base = 20
        if "database" in modules:
            base += 30
        if "api" in modules:
            base += 20
        if "infrastructure" in modules:
            base += 25
        return min(base, 100)

    @classmethod
    def _security_impact(cls, change: Dict) -> int:
        modules = [m.lower() for m in change.get("affected_modules", [])]
        if any(m in ["security", "authentication", "auth", "payment"] for m in modules):
            return 75
        return 15

    @classmethod
    def _maintainability_impact(cls, score: float) -> int:
        return min(int(score * 15), 100)

    @classmethod
    def _recommendations(cls, risk: Dict, change: Dict) -> List[str]:
        recs = []
        level = risk["level"]
        modules = change.get("affected_modules", [])

        if level == "critical":
            recs.append("🚨 CRITICAL: Admin approval required before proceeding")
            recs.append("📋 Add 30% contingency buffer to budget and timeline")
            recs.append("👥 Assign dedicated senior team for all critical components")
            recs.append("🔒 Implement weekly security reviews during implementation")
        elif level == "high":
            recs.append("⚠️ High Risk: Senior PM approval required")
            recs.append("📋 Add 20% contingency buffer to estimates")
            recs.append("👥 Assign senior developers to critical modules")
        elif level == "medium":
            recs.append("📝 Create detailed implementation plan before starting")
            recs.append("🔍 Conduct peer review on all affected modules")
        else:
            recs.append("✅ Standard change management process applies")
            recs.append("📄 Document changes in the project changelog")

        ct = change.get("change_type", "")
        if ct == "addition":
            recs.append("🏗️ Ensure proper integration and regression testing")
        elif ct == "modification":
            recs.append("🔄 Plan and test rollback strategy")
        elif ct == "removal":
            recs.append("🔍 Audit all dependencies before removal")
        elif ct == "refactor":
            recs.append("🧪 Maintain 100% test coverage during refactor")

        if "database" in [m.lower() for m in modules]:
            recs.append("💾 Create verified database backup before migration")
        if "payment" in [m.lower() for m in modules]:
            recs.append("💰 Coordinate with finance team and run payment sandbox tests")
        if "security" in [m.lower() for m in modules] or "authentication" in [
            m.lower() for m in modules
        ]:
            recs.append("🔐 Schedule full security audit post-implementation")

        return recs[:6]

    @classmethod
    def _affected_components(cls, modules: List[str]) -> List[Dict]:
        components = []
        for i, module in enumerate(modules[:6]):
            key = module.lower()
            if key in cls.COMPONENT_MAP:
                c = cls.COMPONENT_MAP[key]
                components.append(
                    {
                        "name": c["name"],
                        "type": c["type"],
                        "impact_level": c["impact_level"],
                        "estimated_hours": c["hours"],
                        "impact_description": c.get("description", ""),
                        "priority": i + 1,
                    }
                )
            else:
                components.append(
                    {
                        "name": module,
                        "type": "Custom Module",
                        "impact_level": "Medium",
                        "estimated_hours": 16,
                        "impact_description": "Custom module integration required",
                        "priority": i + 1,
                    }
                )
        return components

    @classmethod
    def _dependency_chain(cls, modules: List[str]) -> str:
        if not modules:
            return ""
        chain = []
        for m in modules:
            m_l = m.lower()
            if m_l not in chain:
                chain.append(m_l)
            nxt = cls.DEPENDENCY_CHAIN_MAP.get(m_l)
            if nxt and nxt not in chain:
                chain.append(nxt)
        return " → ".join(chain[:6])

    @classmethod
    def _confidence(cls, score: float) -> int:
        base = 85
        if score > 3.5:
            base -= 15
        elif score > 2.5:
            base -= 10
        elif score < 1.5:
            base += 5
        return max(50, min(99, base))

    @classmethod
    def get_exchange_rate(
        cls, db, from_currency: str = "USD", to_currency: str = "INR"
    ) -> float:
        """Get exchange rate from DB cache, fallback to 83.5"""
        try:
            from .models import ExchangeRate

            rate = (
                db.query(ExchangeRate)
                .filter(
                    ExchangeRate.from_currency == from_currency,
                    ExchangeRate.to_currency == to_currency,
                )
                .first()
            )
            return float(rate.rate) if rate else 83.5
        except Exception:
            return 83.5

    @classmethod
    def convert_currency(
        cls, amount: float, from_currency: str, to_currency: str, db=None
    ) -> float:
        if from_currency == to_currency:
            return round(amount, 2)
        rate = cls.get_exchange_rate(db, from_currency, to_currency) if db else 83.5
        if from_currency == "USD" and to_currency == "INR":
            return round(amount * rate, 2)
        elif from_currency == "INR" and to_currency == "USD":
            return round(amount / rate, 2)
        return round(amount, 2)
