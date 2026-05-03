"""
Extended verification: API role matrix + sample impact calculator ranges.

Run with backend server on http://127.0.0.1:5000 (see verify_system.py).
"""

from __future__ import annotations

import json
import sys

import requests

from app.calculators import ImpactCalculator

BASE = "http://127.0.0.1:5000/api"


def login(email: str, password: str) -> dict:
    r = requests.post(
        f"{BASE}/auth/login",
        json={"email": email, "password": password},
        timeout=30,
    )
    if r.status_code != 200:
        raise RuntimeError(f"login failed {email}: {r.status_code} {r.text[:200]}")
    return r.json()


def h(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def check_api_role_matrix() -> list[tuple[str, bool, str]]:
    """Returns list of (name, ok, detail)."""
    results: list[tuple[str, bool, str]] = []

    admin = login("aniketagarwal359@gmail.com", "password")
    pm = login("pm_test@test.com", "Test@12345")
    client = login("client_test@test.com", "Test@12345")

    at, pt, ct = admin["access_token"], pm["access_token"], client["access_token"]

    # Admin endpoints
    r = requests.get(f"{BASE}/admin/users", headers=h(at), timeout=30)
    results.append(("admin GET /admin/users", r.status_code == 200, f"status={r.status_code}"))

    r = requests.get(f"{BASE}/admin/users", headers=h(pt), timeout=30)
    results.append(("pm GET /admin/users -> 403", r.status_code == 403, f"status={r.status_code}"))

    r = requests.get(f"{BASE}/admin/users", headers=h(ct), timeout=30)
    results.append(("client GET /admin/users -> 403", r.status_code == 403, f"status={r.status_code}"))

    # Project create: PM/admin only
    body = {
        "name": "__verify_matrix_project__",
        "team_size": 5,
        "cost_per_day": 5000,
        "initial_duration": 30,
        "stage": "mid",
        "currency": "INR",
    }
    r = requests.post(f"{BASE}/projects", headers=h(at), json=body, timeout=30)
    ok_create = r.status_code in (200, 201)
    results.append(("admin POST /projects", ok_create, f"status={r.status_code}"))

    r = requests.post(f"{BASE}/projects", headers=h(ct), json=body, timeout=30)
    results.append(("client POST /projects -> 403", r.status_code == 403, f"status={r.status_code}"))

    # Lists (authenticated)
    for role, tok in ("admin", at), ("pm", pt), ("client", ct):
        r = requests.get(f"{BASE}/projects", headers=h(tok), timeout=30)
        results.append((f"{role} GET /projects", r.status_code == 200, f"status={r.status_code}"))

    # Change requests list — all roles may hit endpoint; 200 expected if authorized
    for role, tok in ("admin", at), ("pm", pt), ("client", ct):
        r = requests.get(f"{BASE}/change-requests", headers=h(tok), timeout=30)
        results.append((f"{role} GET /change-requests", r.status_code == 200, f"status={r.status_code}"))

    return results


def check_sample_impact() -> list[tuple[str, bool, str]]:
    """Checklist-style sample; bands are guidance (warn if outside)."""
    results: list[tuple[str, bool, str]] = []
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

    results.append(("change_size is Large or Very Large", size in ("Large", "Very Large"), size))
    results.append(("cost_pct in 10–35% (checklist ~15–25%)", 10 <= cost_pct <= 35, f"{cost_pct}%"))
    results.append(("time_inc in 8–50 days (checklist ~12–18)", 8 <= time_inc <= 50, f"{time_inc} days"))
    results.append(("risk_score in 50–100 (checklist ~60–80 high)", 50 <= risk <= 100, str(risk)))
    names = [c["name"] for c in out.get("affected_components", [])]
    ok_names = any("Authentication" in n or "Auth" in n for n in names) and any(
        "Database" in n for n in names
    )
    results.append(("affected_components auth + db", ok_names, str(names)))
    recs = out.get("recommendations", [])
    ok_rec = len(recs) >= 3
    results.append(("recommendations count >= 3", ok_rec, str(len(recs))))

    return results


def main() -> None:
    print("=== API role matrix ===")
    api_results = check_api_role_matrix()
    for name, ok, detail in api_results:
        print(f"[{'OK' if ok else 'FAIL'}] {name}: {detail}")
    api_ok = all(x[1] for x in api_results)

    print("\n=== Sample impact (calculator) ===")
    calc_results = check_sample_impact()
    for name, ok, detail in calc_results:
        print(f"[{'OK' if ok else 'FAIL'}] {name}: {detail}")
    calc_ok = all(x[1] for x in calc_results)

    print("\nSUMMARY:", "PASS" if api_ok and calc_ok else "FAIL")
    if not api_ok or not calc_ok:
        sys.exit(1)


if __name__ == "__main__":
    main()
