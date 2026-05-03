"""
ImpactSensei v5.1 - FastAPI Application
Three-tier: Admin / Project Manager / Client
New: WebSockets, 2FA, Analytics, Webhooks
"""

import os

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import ipaddress

from .database import init_db, SessionLocal
from .models import IpWhitelist, AuditLog
from .routers import (
    admin,
    analysis,
    analytics,
    auth,
    change_requests,
    comments,
    companies,
    notifications,
    project_management,
    projects,
    reports,
    requirements,
    scenarios,
    scheduled_reports,
    sprints,
    templates,
    tfa,
    webhooks,
    websocket,
)

app = FastAPI(
    title="ImpactSensei API",
    description="Enterprise Impact Prediction Platform — v5.1 (WebSockets · 2FA · Analytics · Webhooks)",
    version="5.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://impact-sensei.vercel.app",
        "https://impact-sensei-mlj0sg8ha-aniketagarwal-aas-projects.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8080",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Log the exception here in a real production environment
    print(f"Global exception caught: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"},
    )

@app.middleware("http")
async def ip_whitelisting_middleware(request: Request, call_next):
    # Only protect API routes
    if not request.url.path.startswith("/api/"):
        return await call_next(request)
        
    client_ip = request.client.host if request.client else "127.0.0.1"
    
    # Simple check for test/dev
    if client_ip in ("127.0.0.1", "::1", "localhost"):
        return await call_next(request)

    db = SessionLocal()
    try:
        whitelists = db.query(IpWhitelist).all()
        if not whitelists:
            return await call_next(request)  # No whitelists configured = allow all
            
        is_allowed = False
        client_ip_obj = ipaddress.ip_address(client_ip)
        
        for w in whitelists:
            try:
                network = ipaddress.ip_network(w.ip_range, strict=False)
                if client_ip_obj in network:
                    is_allowed = True
                    break
            except ValueError:
                continue
                
        if not is_allowed:
            from fastapi.responses import JSONResponse
            return JSONResponse(status_code=403, content={"detail": "IP address not allowed."})
            
        return await call_next(request)
    finally:
        db.close()

import time
from collections import defaultdict

# Simple memory-based rate limiting (100 requests per minute per IP)
rate_limits = defaultdict(list)

@app.middleware("http")
async def rate_limiting_middleware(request: Request, call_next):
    if not request.url.path.startswith("/api/"):
        return await call_next(request)
        
    client_ip = request.client.host if request.client else "127.0.0.1"
    now = time.time()
    
    # Clean up old requests
    rate_limits[client_ip] = [req_time for req_time in rate_limits[client_ip] if now - req_time < 60]
    
    if len(rate_limits[client_ip]) >= 100:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=429, content={"detail": "Too Many Requests"})
        
    rate_limits[client_ip].append(now)
    return await call_next(request)

# Routers — Core
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(companies.router)
app.include_router(projects.router)
app.include_router(requirements.router)
app.include_router(change_requests.router)
app.include_router(analysis.router)
app.include_router(scenarios.router)
app.include_router(comments.router)
app.include_router(reports.router)
app.include_router(notifications.router)
app.include_router(templates.router)
# Routers — v5.1 New Features
app.include_router(tfa.router)
app.include_router(analytics.router)
app.include_router(webhooks.router)
app.include_router(websocket.router)
app.include_router(project_management.router)
app.include_router(scheduled_reports.router)
app.include_router(sprints.router)


@app.on_event("startup")
async def startup_event():
    init_db()
    # Try to fetch live exchange rates on startup
    try:
        from .currency import refresh_rates_in_db
        from .database import SessionLocal

        db = SessionLocal()
        await refresh_rates_in_db(db)
        db.close()
    except Exception as e:
        print(f"[Startup] Currency refresh skipped: {e}")

    # Initialize APScheduler
    scheduler = AsyncIOScheduler()
    
    # Audit log cleanup job (runs daily)
    def cleanup_audit_logs():
        db = SessionLocal()
        try:
            from datetime import datetime, timedelta
            # Default 90 days retention if not set
            cutoff = datetime.utcnow() - timedelta(days=90)
            db.query(AuditLog).filter(AuditLog.created_at < cutoff).delete()
            db.commit()
        except Exception as e:
            print(f"[Scheduler] Cleanup error: {e}")
            db.rollback()
        finally:
            db.close()
            
    scheduler.add_job(cleanup_audit_logs, 'cron', hour=2, minute=0) # Run at 2 AM
    scheduler.start()

    print("\n" + "=" * 60)
    print("ImpactSensei v5.1 - Enterprise Impact Platform")
    print("API:    http://localhost:5000")
    print("Docs:   http://localhost:5000/docs")
    print("Roles:  Admin | Project Manager | Client")
    print("Currency: INR and USD (live conversion)")
    print("Auth:   JWT + RBAC + 2FA (TOTP)")
    print("WS:     ws://localhost:5000/ws/{user_id}")
    print("Analytics: Anomaly Detection + Sentiment")
    print("Webhooks: Jira | Slack | GitHub | Zapier")
    print("=" * 60 + "\n")


@app.get("/")
async def root():
    return {
        "app": "ImpactSensei",
        "version": "5.0.0",
        "status": "running",
        "roles": ["admin", "project_manager", "client"],
    }


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "message": "ImpactSensei API Running"}

@app.get("/health")
async def health_check_redirect():
    return {"status": "healthy", "message": "ImpactSensei API Running"}


@app.get("/api/settings/public")
async def public_settings():
    """Public endpoint — exchange rate, app name, etc."""
    from .database import SessionLocal
    from .models import ExchangeRate, SystemSetting

    db = SessionLocal()
    try:
        keys = [
            "app.name",
            "app.version",
            "app.tagline",
            "currency.default",
            "currency.exchange_rate_usd_to_inr",
        ]
        settings = db.query(SystemSetting).filter(SystemSetting.key.in_(keys)).all()
        result = {s.key: s.value for s in settings}

        # Also return all available rates
        rates = db.query(ExchangeRate).filter(ExchangeRate.from_currency == "USD").all()
        result["exchange_rates"] = {r.to_currency: float(r.rate) for r in rates}
        return result
    finally:
        db.close()


@app.post("/api/currency/refresh")
async def refresh_currency():
    """Manually trigger live rate refresh"""
    from .currency import refresh_rates_in_db
    from .database import SessionLocal

    db = SessionLocal()
    try:
        success = await refresh_rates_in_db(db)
        return {
            "success": success,
            "message": "Rates refreshed" if success else "Using fallback rates",
        }
    finally:
        db.close()
