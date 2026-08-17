import uuid
import pandas as pd
from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app
from app.services.constraint_service import constraint_engine

client = TestClient(app)

def test_banking_constraint_engine_valid_data():
    sample_csv_path = Path(__file__).resolve().parent.parent.parent / "data" / "sample_banking_transactions.csv"
    df = pd.read_csv(sample_csv_path)

    results = constraint_engine.validate_constraints(df)
    assert results["total_records"] == 2500
    assert results["valid_records"] > 2200
    assert results["valid_pct"] > 90.0
    assert "amount_non_negative" in results["rule_violations"]

def test_banking_constraint_engine_invalid_records_detection():
    invalid_df = pd.DataFrame({
        "amount": [100.0, -50.0, 200.0],  # row 1 invalid (negative amount)
        "age": [25, 30, 150],             # row 2 invalid (age > 100)
        "balance_before": [1000.0, -10.0, 500.0], # row 1 invalid (negative balance)
        "balance_after": [900.0, 0.0, 300.0],
        "transaction_hour": [12, 14, 28], # row 2 invalid (hour > 23)
        "is_fraud": [0, 1, 5]             # row 2 invalid (fraud not binary)
    })

    results = constraint_engine.validate_constraints(invalid_df)
    assert results["total_records"] == 3
    assert results["invalid_records"] == 2
    assert results["valid_records"] == 1
    assert results["rule_violations"]["amount_non_negative"] == 1
    assert results["rule_violations"]["age_bounds"] == 1
    assert results["rule_violations"]["hour_validity"] == 1

def test_constraint_evaluation_api_endpoint():
    user_payload = {
        "email": f"constraint_tester_{uuid.uuid4().hex[:6]}@example.com",
        "password": "Password123!",
        "full_name": "Constraint Tester"
    }
    client.post("/api/v1/auth/register", json=user_payload)
    login_res = client.post("/api/v1/auth/login", json={"email": user_payload["email"], "password": user_payload["password"]})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    sample_csv_path = Path(__file__).resolve().parent.parent.parent / "data" / "sample_banking_transactions.csv"
    with open(sample_csv_path, "rb") as f:
        upload_res = client.post(
            "/api/v1/datasets/upload",
            files={"file": ("sample_banking_transactions.csv", f, "text/csv")},
            headers=headers
        )
    dataset_id = upload_res.json()["id"]

    eval_res = client.post(f"/api/v1/evaluation/constraints?dataset_id={dataset_id}", headers=headers)
    assert eval_res.status_code == 200
    res_data = eval_res.json()
    assert res_data["total_records"] == 2500
    assert "valid_pct" in res_data
    assert "rule_violations" in res_data
