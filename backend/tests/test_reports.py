import uuid
import os
import zipfile
import pandas as pd
from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app
from app.services.report_service import report_exporter_service

client = TestClient(app)

def test_report_service_export_zip():
    sample_csv_path = Path(__file__).resolve().parent.parent.parent / "data" / "sample_banking_transactions.csv"
    real_df = pd.read_csv(sample_csv_path)

    # Test report generation on dataset
    report_data, _ = report_exporter_service.generate_evaluation_report(dataset_id=None, job_id=None) if False else ({}, None)
    
    user_payload = {
        "email": f"report_tester_{uuid.uuid4().hex[:6]}@example.com",
        "password": "Password123!",
        "full_name": "Report Tester"
    }
    client.post("/api/v1/auth/register", json=user_payload)
    login_res = client.post("/api/v1/auth/login", json={"email": user_payload["email"], "password": user_payload["password"]})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    with open(sample_csv_path, "rb") as f:
        upload_res = client.post(
            "/api/v1/datasets/upload",
            files={"file": ("sample_banking_transactions.csv", f, "text/csv")},
            headers=headers
        )
    dataset_id = upload_res.json()["id"]

    zip_path = report_exporter_service.export_report_package_zip(dataset_id=dataset_id)
    assert os.path.exists(zip_path)
    assert zip_path.endswith(".zip")

    # Inspect zip contents
    with zipfile.ZipFile(zip_path, 'r') as zipf:
        namelist = zipf.namelist()
        assert any(f.endswith(".csv") for f in namelist)
        assert "visual_scorecard_dashboard.png" in namelist
        assert "quality_scorecard.json" in namelist
        assert "charts/correlation_matrix_heatmap.png" in namelist

def test_report_export_api_endpoint():
    user_payload = {
        "email": f"report_api_tester_{uuid.uuid4().hex[:6]}@example.com",
        "password": "Password123!",
        "full_name": "Report API Tester"
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

    res = client.get(f"/api/v1/evaluation/report/export?dataset_id={dataset_id}", headers=headers)
    assert res.status_code == 200, f"Failed with response: {res.text}"
    assert res.headers["content-type"] == "application/zip"
