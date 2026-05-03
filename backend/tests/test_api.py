import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app.models import User, Company

# Setup test DB
Base.metadata.create_all(bind=engine)

client = TestClient(app)

@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_public_settings():
    response = client.get("/api/settings/public")
    assert response.status_code == 200
    assert "app.name" in response.json()

def test_unauthorized_access():
    response = client.get("/api/projects")
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"

def test_currency_refresh():
    response = client.post("/api/currency/refresh")
    assert response.status_code == 200
    assert "success" in response.json()

def test_auth_login_invalid():
    response = client.post(
        "/api/auth/login",
        json={"email": "wrong@email.com", "password": "wrongpassword"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"
