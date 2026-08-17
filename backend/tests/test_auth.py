import uuid
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_user_registration_and_login():
    unique_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    password = "secretPassword123"

    # Register
    reg_payload = {
        "email": unique_email,
        "password": password,
        "full_name": "Test Engineering User",
        "organization": "BE Computer Science"
    }
    reg_res = client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_res.status_code == 201
    reg_data = reg_res.json()
    assert "access_token" in reg_data
    assert reg_data["user"]["email"] == unique_email

    # Duplicate Register Attempt
    dup_res = client.post("/api/v1/auth/register", json=reg_payload)
    assert dup_res.status_code == 400

    # Login
    login_payload = {
        "email": unique_email,
        "password": password
    }
    login_res = client.post("/api/v1/auth/login", json=login_payload)
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]

    # Get /me with Token
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["email"] == unique_email
