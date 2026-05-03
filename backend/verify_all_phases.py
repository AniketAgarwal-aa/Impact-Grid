#!/usr/bin/env python3
"""
ImpactSensei — consolidated automated verification (maximum scripted coverage).

Runs machine-checkable portions of the deployment checklist. Items that require
manual QA, production SMTP, or long waits are marked AUTOMATED_PARTIAL.

Usage (API must be up on BASE_URL, DB file present):
  cd backend && python verify_all_phases.py
  python backend/verify_all_phases.py --no-playwright   # skip browser suite

Requires optional deps already in requirements: requests, websockets.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sqlite3
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import requests

_BACKEND_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _BACKEND_DIR.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

import verify_system as vs  # noqa: E402

BASE_URL = vs.BASE_URL


@dataclass
class PhaseResult:
    phase_id: str
    name: str
    ok: bool
    detail: str = ""
    automated_partial: bool = False


def _ok(name: str, ok: bool, detail: str = "", partial: bool = False) -> PhaseResult:
    return PhaseResult(
        phase_id=name.split(":")[0].strip(),
        name=name,
        ok=ok,
        detail=detail,
        automated_partial=partial,
    )


def run_verify_system_core() -> list[PhaseResult]:
    """Phases 1, 3 (routes), 6 (calculator), and auth/API subset from verify_system."""
    out: list[PhaseResult] = []
    fs = vs.check_file_structure()
    out.append(_ok("P1: File structure", fs.ok, fs.details))
    db = vs.check_database()
    out.append(_ok("P1: Database tables", db.ok, db.details))
    calc = vs.check_impact_calculator_offline()
    out.append(_ok("P6: Impact calculator", calc.ok, calc.details))
    for r in vs.check_auth_and_core_api():
        out.append(_ok(f"P2/P11: {r.name}", r.ok, r.details))
    routes = vs.check_frontend_routes_declared()
    out.append(_ok("P3: Route declarations (App.tsx)", routes.ok, routes.details))
    return out


def phase_email_smoke() -> PhaseResult:
    """P7: Forgot-password accepts request (console/template path on server)."""
    r = requests.post(
        f"{BASE_URL}/api/auth/forgot-password",
        json={"email": "phase_check@local.dev"},
        timeout=15,
    )
    ok = r.status_code == 200
    return _ok("P7: Email smoke (forgot-password)", ok, f"status={r.status_code}")


def phase_ws_ping(user_id: int = 1) -> PhaseResult:
    """P5: WebSocket connects and responds to ping."""

    async def _run() -> tuple[bool, str]:
        try:
            import websockets
        except ImportError:
            return False, "websockets package missing"

        uri = f"ws://127.0.0.1:5000/ws/{user_id}"
        try:
            async with websockets.connect(uri, close_timeout=3) as ws:
                await ws.send(json.dumps({"type": "ping"}))
                for _ in range(6):
                    raw = await asyncio.wait_for(ws.recv(), timeout=5)
                    data = json.loads(raw)
                    if data.get("type") == "pong":
                        return True, "received pong"
                return False, "no pong in first messages"
        except Exception as e:
            return False, str(e)

    ok, detail = asyncio.run(_run())
    return _ok("P5: WebSocket ping/pong", ok, detail, partial=False)


def phase_analytics_smoke(admin_token: str) -> PhaseResult:
    """P8: Key analytics endpoints return 200 for admin."""
    h = {"Authorization": f"Bearer {admin_token}"}
    paths = [
        "/api/analytics/predictions",
        "/api/analytics/forecast/sprints",
        "/api/analytics/anomalies",
        "/api/analytics/usage",
    ]
    bad = []
    for p in paths:
        r = requests.get(f"{BASE_URL}{p}", headers=h, timeout=20)
        if r.status_code >= 500:
            bad.append(f"{p}:{r.status_code}")
    ok = len(bad) == 0
    return _ok("P8: Analytics endpoints (admin)", ok, "OK" if ok else ",".join(bad))


def phase_pm_features_smoke(admin_token: str) -> PhaseResult:
    """P9: Project-management routes if at least one project exists."""
    h = {"Authorization": f"Bearer {admin_token}"}
    pr = requests.get(f"{BASE_URL}/api/projects", headers=h, timeout=20)
    if pr.status_code != 200:
        return _ok("P9: PM features smoke", False, f"projects status={pr.status_code}")
    projects = pr.json()
    if not projects:
        return _ok(
            "P9: PM features smoke",
            True,
            "no projects — skipped gantt/burndown (AUTOMATED_PARTIAL)",
            partial=True,
        )
    pid = projects[0].get("id")
    gantt = requests.get(f"{BASE_URL}/api/gantt/{pid}", headers=h, timeout=20)
    sla = requests.get(f"{BASE_URL}/api/sla/dashboard", headers=h, timeout=20)
    ok = gantt.status_code < 500 and sla.status_code < 500
    return _ok(
        "P9: PM features (gantt + sla dashboard)",
        ok,
        f"gantt={gantt.status_code} sla={sla.status_code} project_id={pid}",
    )


def phase_api_extended_matrix(
    admin_token: str,
    pm_token: str,
    client_token: str,
) -> PhaseResult:
    """P11: Broad GET smoke — must not 500."""
    checks: list[tuple[str, str | None, int | None]] = []

    def get(path: str, token: str | None) -> int:
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        r = requests.get(f"{BASE_URL}{path}", headers=headers, timeout=25)
        return r.status_code

    # Admin-only / privileged
    for path in (
        "/api/admin/settings",
        "/api/admin/audit-logs",
        "/api/admin/ip-whitelist",
        "/api/admin/encryption/status",
        "/api/admin/companies",
        "/api/notifications",
        "/api/templates",
        "/api/scenarios",
        "/api/change-requests",
        "/api/reports/scheduled",
    ):
        checks.append((path, admin_token, get(path, admin_token)))

    # PM / admin shared
    for path in (
        "/api/requirements",
    ):
        checks.append((path, pm_token, get(path, pm_token)))

    client_paths = [
        "/api/notifications",
        "/api/scenarios",
        "/api/change-requests",
    ]
    for path in client_paths:
        checks.append((path + " (client)", client_token, get(path, client_token)))

    bad = [f"{p}:{st}" for p, _, st in checks if st >= 500]
    ok = len(bad) == 0
    detail = f"{len(checks)} GETs, failures={bad[:8]}" if bad else f"{len(checks)} GETs OK"
    return _ok("P11: API GET smoke matrix", ok, detail)


def phase_db_integrity_and_security() -> tuple[PhaseResult, PhaseResult]:
    """P12 duplicate registration; P14 bcrypt hash sample."""
    dup = requests.post(
        f"{BASE_URL}/api/auth/register",
        json={
            "email": "aniketagarwal359@gmail.com",
            "password": "ValidPass1",
            "full_name": "dup",
        },
        timeout=15,
    )
    p12 = _ok(
        "P12: Duplicate email rejected",
        dup.status_code == 400,
        f"register duplicate status={dup.status_code}",
    )

    db_path = vs.BACKEND / "impact_sensei.db"
    hash_ok = False
    detail = "db missing"
    if db_path.exists():
        conn = sqlite3.connect(str(db_path))
        try:
            row = conn.execute("SELECT password_hash FROM users LIMIT 1").fetchone()
            hash_ok = bool(row and row[0] and str(row[0]).startswith("$2"))
            detail = "bcrypt-like prefix" if hash_ok else str(row)
        finally:
            conn.close()
    p14 = _ok("P14: Password hash stored (bcrypt)", hash_ok, detail)

    return p12, p14


def phase_performance_smoke() -> PhaseResult:
    """P13: Health latency smoke (not full SLA)."""
    times_ms: list[float] = []
    for _ in range(15):
        t0 = time.perf_counter()
        r = requests.get(f"{BASE_URL}/api/health", timeout=10)
        dt = (time.perf_counter() - t0) * 1000
        times_ms.append(dt)
        if r.status_code != 200:
            return _ok("P13: Performance smoke (health)", False, f"status={r.status_code}")
    mx = max(times_ms)
    ok = mx < 3000
    return _ok(
        "P13: Performance smoke (health max ms)",
        ok,
        f"p95~{sorted(times_ms)[int(len(times_ms)*0.95)]:.1f} max={mx:.1f}ms",
        partial=True,
    )


def phase_register_verify_bad_token() -> PhaseResult:
    """P2: Verify-email rejects garbage token."""
    r = requests.post(
        f"{BASE_URL}/api/auth/verify-email",
        json={"token": "invalid-token-phase-check"},
        timeout=10,
    )
    ok = r.status_code == 400
    return _ok("P2: Verify-email invalid token returns 400", ok, f"status={r.status_code}")


def run_playwright(repo_root: Path, skip: bool) -> PhaseResult:
    """P3/P4/P10/P15: Browser smoke & journeys covered by Playwright tests."""
    if skip:
        return _ok(
            "P3/P4/P10/P15: Playwright E2E",
            True,
            "skipped (--no-playwright)",
            partial=True,
        )
    cmd = ["npx", "playwright", "test", "--reporter=list"]
    try:
        cp = subprocess.run(
            cmd,
            cwd=str(repo_root),
            capture_output=True,
            text=True,
            timeout=600,
        )
    except subprocess.TimeoutExpired:
        return _ok("P3/P4/P10/P15: Playwright E2E", False, "timeout 600s")
    ok = cp.returncode == 0
    tail = (cp.stdout or "")[-1200:] + (cp.stderr or "")[-600:]
    return _ok(
        "P3/P4/P10/P15: Playwright E2E",
        ok,
        tail.strip()[:800] if not ok else "all playwright tests passed",
        partial=True,
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--no-playwright",
        action="store_true",
        help="Skip npx playwright test (requires frontend on :8080 when enabled)",
    )
    args = parser.parse_args()

    health = requests.get(f"{BASE_URL}/api/health", timeout=5)
    if health.status_code != 200:
        print(f"ERROR: API not reachable at {BASE_URL} (health={health.status_code})")
        sys.exit(1)

    admin_login = vs.login("aniketagarwal359@gmail.com", "password", remember_me=True)
    if admin_login["status"] != 200 or not admin_login["json"].get("access_token"):
        print("ERROR: Admin login failed — cannot run extended phases.")
        sys.exit(1)
    admin_token = admin_login["json"]["access_token"]
    pm_login = vs.login("pm_test@test.com", "Test@12345")
    client_login = vs.login("client_test@test.com", "Test@12345")
    pm_token = pm_login["json"].get("access_token", "")
    client_token = client_login["json"].get("access_token", "")

    results: list[PhaseResult] = []

    results.extend(run_verify_system_core())
    results.append(phase_register_verify_bad_token())
    results.append(phase_email_smoke())
    results.append(phase_ws_ping(user_id=1))
    results.append(phase_analytics_smoke(admin_token))
    results.append(phase_pm_features_smoke(admin_token))
    results.append(
        phase_api_extended_matrix(admin_token, pm_token or admin_token, client_token or admin_token)
    )
    p12, p14 = phase_db_integrity_and_security()
    results.append(p12)
    results.append(p14)
    results.append(phase_performance_smoke())
    results.append(run_playwright(_REPO_ROOT, skip=args.no_playwright))

    passed = sum(1 for r in results if r.ok)
    total = len(results)
    failed_names = [r.name for r in results if not r.ok]

    print("\n" + "=" * 72)
    print("AUTOMATED PHASE REPORT (scripted checks only)")
    print("=" * 72)
    for r in results:
        flag = "PASS" if r.ok else "FAIL"
        part = " [PARTIAL]" if r.automated_partial else ""
        print(f"  [{flag}]{part} {r.name}")
        if r.detail and (not r.ok or len(r.detail) < 200):
            print(f"         {r.detail[:300]}")
    print("-" * 72)
    print(f"SUMMARY: {passed}/{total} checks passed")
    if failed_names:
        print(f"FAILED: {failed_names}")
    print("\nNOT AUTOMATED IN THIS SCRIPT (require manual / prod / long waits):")
    print("  - Full P4 button-by-button QA, P7 delivery to real inboxes")
    print("  - P10 full responsive/onboarding/visual QA")
    print("  - P13 bundle/Lighthouse/backend memory profiling")
    print("  - P14 JWT 15m expiry wait, refresh rotation torture-test")
    print("  - P15 full business journey beyond Playwright coverage")
    print("=" * 72 + "\n")

    if passed != total:
        sys.exit(1)


if __name__ == "__main__":
    main()
