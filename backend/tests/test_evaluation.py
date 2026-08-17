import uuid
import pandas as pd
from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app
from app.services.statistical_service import statistical_fidelity_engine
from app.services.diversity_service import diversity_engine
from app.services.privacy_service import privacy_engine

client = TestClient(app)

def test_statistical_fidelity_evaluation():
    sample_csv_path = Path(__file__).resolve().parent.parent.parent / "data" / "sample_banking_transactions.csv"
    real_df = pd.read_csv(sample_csv_path)
    synth_df = real_df.sample(500, random_state=42).copy()

    res = statistical_fidelity_engine.evaluate_fidelity(real_df, synth_df)
    assert res["statistical_fidelity_score"] > 80.0
    assert "amount" in res["numerical_metrics"]
    assert "ks_statistic" in res["numerical_metrics"]["amount"]

def test_diversity_evaluation():
    sample_csv_path = Path(__file__).resolve().parent.parent.parent / "data" / "sample_banking_transactions.csv"
    df = pd.read_csv(sample_csv_path)

    res = diversity_engine.evaluate_diversity(df)
    assert res["diversity_score"] > 95.0
    assert "duplicate_rows_count" in res

def test_privacy_risk_assessment():
    sample_csv_path = Path(__file__).resolve().parent.parent.parent / "data" / "sample_banking_transactions.csv"
    real_df = pd.read_csv(sample_csv_path)
    synth_df = real_df.sample(200, random_state=42).copy()

    res = privacy_engine.evaluate_privacy(real_df, synth_df)
    assert "privacy_risk_level" in res
    assert "distance_to_closest_record" in res
    assert "exact_duplicate_matches" in res

def test_full_evaluation_scorecard_api_endpoint():
    user_payload = {
        "email": f"eval_tester_{uuid.uuid4().hex[:6]}@example.com",
        "password": "Password123!",
        "full_name": "Evaluation Tester"
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

    full_res = client.post(f"/api/v1/evaluation/full?dataset_id={dataset_id}", headers=headers)
    assert full_res.status_code == 200
    scorecard = full_res.json()
    assert scorecard["overall_quality_score"] > 80.0
    assert "constraints" in scorecard
    assert "statistical_fidelity" in scorecard
    assert "diversity" in scorecard
    assert "privacy" in scorecard
