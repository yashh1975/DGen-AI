import uuid
import os
from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_dataset_lifecycle_and_profiling():
    # 1. Register & Login User
    user_payload = {
        "email": f"dataset_tester_{uuid.uuid4().hex[:6]}@example.com",
        "password": "Password123!",
        "full_name": "Dataset Tester"
    }
    client.post("/api/v1/auth/register", json=user_payload)
    login_res = client.post("/api/v1/auth/login", json={"email": user_payload["email"], "password": user_payload["password"]})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Upload Sample Banking Dataset
    sample_csv_path = Path(__file__).resolve().parent.parent.parent / "data" / "sample_banking_transactions.csv"
    assert sample_csv_path.exists(), "Sample banking dataset file must exist"

    with open(sample_csv_path, "rb") as f:
        upload_res = client.post(
            "/api/v1/datasets/upload",
            files={"file": ("sample_banking_transactions.csv", f, "text/csv")},
            headers=headers
        )
    assert upload_res.status_code == 201
    dataset = upload_res.json()
    dataset_id = dataset["id"]
    assert dataset["row_count"] == 1000
    assert dataset["target_fraud_column"] == "is_fraud"

    # 3. List Datasets
    list_res = client.get("/api/v1/datasets", headers=headers)
    assert list_res.status_code == 200
    assert any(d["id"] == dataset_id for d in list_res.json())

    # 4. Get Dataset Sample Preview
    sample_res = client.get(f"/api/v1/datasets/{dataset_id}/sample?rows=10", headers=headers)
    assert sample_res.status_code == 200
    sample_data = sample_res.json()
    assert len(sample_data["rows"]) == 10
    assert "balance" in sample_data["columns"]

    # 5. Profile Dataset
    profile_res = client.post(f"/api/v1/datasets/{dataset_id}/profile", headers=headers)
    assert profile_res.status_code == 200
    profile = profile_res.json()
    assert profile["summary"]["total_rows"] == 1000
    assert profile["detected_target_column"] == "is_fraud"
    assert "balance" in profile["numerical_analysis"]
    assert "merchant_category" in profile["categorical_analysis"]

    # 6. Preprocess Dataset
    preprocess_res = client.post(
        f"/api/v1/datasets/{dataset_id}/preprocess?impute_strategy=median&scaling_strategy=minmax",
        headers=headers
    )
    assert preprocess_res.status_code == 200
    pre_data = preprocess_res.json()
    assert pre_data["scaling_strategy"] == "minmax"

    # 7. Delete Dataset
    delete_res = client.delete(f"/api/v1/datasets/{dataset_id}", headers=headers)
    assert delete_res.status_code == 200
    assert delete_res.json()["success"] is True
