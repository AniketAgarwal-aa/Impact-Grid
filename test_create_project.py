import requests
import json

base_url = "http://127.0.0.1:5000/api"

# Login
r = requests.post(f"{base_url}/auth/login", json={
    "email": "pm@impactgrid.com",
    "password": "password123"
})
print("Login status:", r.status_code)
if r.status_code != 200:
    print(r.text)
    exit(1)

token = r.json()["access_token"]

# Create Project
headers = {"Authorization": f"Bearer {token}"}
data = {
    "name": "Test Project",
    "description": "Test",
    "team_size": 5,
    "total_budget": 500000,
    "timeline_days": 30,
    "stage": "mid",
    "currency": "INR",
    "priority": "medium"
}
r = requests.post(f"{base_url}/projects", headers=headers, json=data)
print("Create status:", r.status_code)
print(r.text)
