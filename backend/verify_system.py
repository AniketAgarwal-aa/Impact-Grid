"""
Automated verification runner for ImpactSensei.

Runs machine-checkable checks for:
- file structure
- database schema presence
- auth + key API endpoints
- basic security/rate-limit assertions
- key frontend route presence
"""

from __future__ import annotations

import json
import sqlite3
import sys
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import requests


ROOT = Path(__file__).resolve().parent.parent
BACKEND = ROOT / "backend"
FRONTEND = ROOT
BASE_URL = "http://127.0.0.1:5000"


@dataclass
class CheckResult:
    name: str
    ok: bool
    details: str


def _check(name: str, ok: bool, details: str) -> CheckResult:
    return CheckResult(name=name, ok=ok, details=details)


def check_file_structure() -> CheckResult:
    required = [
        "backend/requirements.txt",
        "backend/run.py",
        "backend/app/main.py",
        "backend/app/database.py",
        "backend/app/models.py",
        "backend/app/schemas.py",
        "backend/app/auth.py",
        "backend/app/calculators.py",
        "backend/app/dependencies.py",
        "backend/app/routers/auth.py",
        "backend/app/routers/admin.py",
        "backend/app/routers/projects.py",
        "backend/app/routers/analysis.py",
        "backend/app/utils/email.py",
        "src/App.tsx",
        "src/main.tsx",
        "src/pages/Login.tsx",
        "src/pages/Signup.tsx",
        "src/pages/Dashboard.tsx",
        "src/pages/AdminDashboard.tsx",
        "src/pages/PMDashboard.tsx",
        "src/services/api.ts",
    ]
    missing = [p for p in required if not (ROOT / p).exists()]
    return _check(
        "Phase 1: File Structure",
        len(missing) == 0,
        "all required core files exist" if not missing else f"missing: {missing}",
    )


def check_database() -> CheckResult:
    db_path = BACKEND / "impact_sensei.db"
    if not db_path.exists():
        return _check("Phase 1: Database", False, "impact_sensei.db not found")

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    )
    tables = {r[0] for r in cur.fetchall()}
    conn.close()

    # Must match SQLAlchemy models (app/models.py __tablename__)
    required_tables = {
        "users",
        "companies",
        "projects",
        "project_assignments",
        "requirements",
        "requirement_dependencies",
        "change_requests",
        "impact_analyses",
        "scenarios",
        "comments",
        "comment_reactions",
        "notifications",
        "audit_logs",
        "templates",
        "system_settings",
        "exchange_rates",
        "email_queue",
        "user_sessions",
        "webhook_configs",
        "webhook_deliveries",
        "scheduled_reports",
        "report_templates",
        "white_label_config",
        "oauth_tokens",
        "tfa_secrets",
        "user_devices",
        "sprints",
        "sprint_tasks",
        "team_availability",
        "satisfaction_surveys",
        "release_notes",
        "rbac_permissions",
        "sla_configs",
        "integration_logs",
        "ip_whitelists",
    }
    missing = sorted(required_tables - tables)
    return _check(
        "Phase 1: Database",
        len(missing) == 0,
        f"{len(tables)} tables found; missing={missing}" if missing else f"{len(tables)} tables found",
    )


def login(email: str, password: str, remember_me: bool = False) -> dict[str, Any]:
    resp = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": email, "password": password, "remember_me": remember_me},
        timeout=10,
    )
    body: dict[str, Any] = {}
    if resp.content and resp.text.strip():
        try:
            body = resp.json()
        except ValueError:
            body = {"_parse_error": True, "_raw": resp.text[:500]}
    return {"status": resp.status_code, "json": body}


def ensure_user(
    admin_token: str, email: str, password: str, role: str, full_name: str
) -> tuple[bool, str]:
    payload = {
        "email": email,
        "password": password,
        "role": role,
        "full_name": full_name,
        "is_verified": True,
    }
    last_err = ""
    for attempt in range(3):
        try:
            resp = requests.post(
                f"{BASE_URL}/api/admin/users",
                headers={"Authorization": f"Bearer {admin_token}"},
                json=payload,
                timeout=40,
            )
            if resp.status_code in (200, 201):
                return True, "created"
            if resp.status_code == 400 and "already" in resp.text.lower():
                return True, "already_exists"
            return False, f"status={resp.status_code} body={resp.text[:200]}"
        except requests.RequestException as exc:
            last_err = f"request_error={exc}"
            if attempt < 2:
                time.sleep(0.5 * (attempt + 1))
    return False, last_err


def check_auth_and_core_api() -> list[CheckResult]:
    results: list[CheckResult] = []

    health = requests.get(f"{BASE_URL}/api/health", timeout=5)
    results.append(_check("API health", health.status_code == 200, f"status={health.status_code}"))

    admin = login("aniketagarwal359@gmail.com", "password", remember_me=True)
    admin_ok = admin["status"] == 200 and admin["json"].get("user", {}).get("role") == "admin"
    admin_detail = f"status={admin['status']}"
    if not admin_ok and admin["json"].get("_parse_error"):
        admin_detail += f" body_snippet={admin['json'].get('_raw', '')[:120]!r}"
    results.append(_check("Admin login", admin_ok, admin_detail))
    if not admin_ok:
        return results

    admin_token = admin["json"]["access_token"]

    created_pm, pm_msg = ensure_user(
        admin_token, "pm_test@test.com", "Test@12345", "project_manager", "PM Test"
    )
    created_client, c_msg = ensure_user(
        admin_token, "client_test@test.com", "Test@12345", "client", "Client Test"
    )
    results.append(_check("Create/ensure PM user", created_pm, pm_msg))
    results.append(_check("Create/ensure client user", created_client, c_msg))

    pm = login("pm_test@test.com", "Test@12345")
    results.append(_check("PM login", pm["status"] == 200, f"status={pm['status']}"))

    client = login("client_test@test.com", "Test@12345")
    results.append(_check("Client login", client["status"] == 200, f"status={client['status']}"))

    me = requests.get(
        f"{BASE_URL}/api/auth/me",
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=20,
    )
    results.append(_check("GET /api/auth/me", me.status_code == 200, f"status={me.status_code}"))

    users = requests.get(
        f"{BASE_URL}/api/admin/users",
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=20,
    )
    results.append(_check("GET /api/admin/users", users.status_code == 200, f"status={users.status_code}"))

    projects = requests.get(
        f"{BASE_URL}/api/projects",
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=20,
    )
    results.append(_check("GET /api/projects", projects.status_code == 200, f"status={projects.status_code}"))

    # Rate limit: fresh email each run so prior attempts don't skew results.
    rl_email = f"rl_{uuid.uuid4().hex[:16]}@local.dev"
    statuses: list[int] = []
    for _ in range(6):
        r = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": rl_email, "password": "wrong"},
            timeout=5,
        )
        statuses.append(r.status_code)
    rate_limit_ok = statuses == [401, 401, 401, 401, 401, 429]
    results.append(
        _check(
            "Auth rate limiting",
            rate_limit_ok,
            f"statuses={statuses} email={rl_email}",
        )
    )

    return results


def check_impact_calculator_offline() -> CheckResult:
    """Sample impact bands without a running API (matches verify_extended checklist)."""
    backend_path = str(BACKEND)
    if backend_path not in sys.path:
        sys.path.insert(0, backend_path)
    try:
        from app.calculators import ImpactCalculator
    except ImportError as exc:
        return _check("Impact calculator (offline)", False, str(exc))

    project = {
        "team_size": 5,
        "cost_per_day": 100000 / 60,
        "initial_duration": 60,
        "stage": "mid",
    }
    change = {
        "change_type": "addition",
        "priority": "high",
        "complexity": "high",
        "affected_modules": ["authentication", "database"],
    }
    out = ImpactCalculator.calculate(project, change, "INR")
    cost_pct = float(out["cost_impact"]["percentage"])
    time_inc = int(out["time_impact"]["increase"])
    risk = int(out["risk_score"])
    size = out["change_size"]
    names = [c["name"] for c in out.get("affected_components", [])]
    ok_size = size in ("Large", "Very Large")
    ok_cost = 10 <= cost_pct <= 35
    ok_time = 8 <= time_inc <= 50
    ok_risk = 50 <= risk <= 100
    ok_names = any("Authentication" in n or "Auth" in n for n in names) and any(
        "Database" in n for n in names
    )
    ok_recs = len(out.get("recommendations", [])) >= 3
    ok = ok_size and ok_cost and ok_time and ok_risk and ok_names and ok_recs
    detail = (
        f"size={size} cost%={cost_pct} time+={time_inc} risk={risk} "
        f"components={names} recs={len(out.get('recommendations', []))}"
    )
    return _check("Impact calculator (offline)", ok, detail)


def check_frontend_routes_declared() -> CheckResult:
    app_file = FRONTEND / "src" / "App.tsx"
    if not app_file.exists():
        return _check("Frontend routes", False, "src/App.tsx missing")
    text = app_file.read_text(encoding="utf-8")
    required_routes = [
        "/",
        "/login",
        "/signup",
        "/verify-email",
        "/dashboard",
        "/projects",
        "/new-analysis",
        "/results/:id",
        "/scenarios",
        "/compare",
        "/reports",
        "/profile",
        "/integrations",
        "/pm/dashboard",
        "/pm/projects",
        "/pm/templates",
        "/pm/approvals",
        "/pm/team",
        "/pm/sprints",
        "/pm/analytics",
        "/pm/integrations",
        "/admin/dashboard",
        "/admin/users",
        "/admin/companies",
        "/admin/security",
        "/admin/audit",
        "/admin/integrations",
    ]
    missing = [r for r in required_routes if r not in text]
    return _check(
        "Phase 3: Route declarations",
        len(missing) == 0,
        "all key routes declared" if not missing else f"missing declarations: {missing}",
    )


def main() -> None:
    import argparse

    p = argparse.ArgumentParser(description="ImpactSensei verification runner")
    p.add_argument(
        "--offline",
        action="store_true",
        help="Skip API checks (no backend on :5000 required)",
    )
    args = p.parse_args()

    results: list[CheckResult] = []
    results.append(check_file_structure())
    results.append(check_database())
    results.append(check_impact_calculator_offline())
    if not args.offline:
        results.extend(check_auth_and_core_api())
    results.append(check_frontend_routes_declared())

    passed = sum(1 for r in results if r.ok)
    total = len(results)
    print(json.dumps([r.__dict__ for r in results], indent=2))
    print(f"\nSUMMARY: {passed}/{total} checks passed")
    if args.offline:
        print("(offline mode: start API and run without --offline for login/API checks)")
    if passed != total:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
