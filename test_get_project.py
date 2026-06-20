import requests

base_url = "http://127.0.0.1:5000/api"

r = requests.post(f"{base_url}/auth/login", json={
    "email": "pm@impactgrid.com",
    "password": "password123"
})
token = r.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

r = requests.get(f"{base_url}/projects/1", headers=headers)
print("Get 1:", r.status_code)
print(r.text)

r = requests.get(f"{base_url}/projects/2", headers=headers)
print("Get 2:", r.status_code)
print(r.text)
