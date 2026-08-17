import uuid
import pandas as pd
from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app
from app.services.fraud_service import fraud_ml_engine
from app.services.experiment_service import experiment_service

client = TestClient(app)

def test_downstream_fraud_ml_utility():
    sample_csv_path = Path(__file__).resolve().parent.parent.parent / "data" / "sample_banking_transactions.csv"
    real_df = pd.read_csv(sample_csv_path)
    synth_df = real_df.sample(1000, random_state=42).copy()

    res = fraud_ml_engine.evaluate_fraud_utility(real_df, synth_df, target_col="is_fraud")

    assert "experiments" in res
    assert "real_only" in res["experiments"]
    assert "synthetic_only" in res["experiments"]
    assert "real_plus_synthetic" in res["experiments"]

    assert "f1_score" in res["experiments"]["real_only"]
    assert "confusion_matrix" in res["experiments"]["real_only"]
    assert len(res["experiments"]["real_only"]["confusion_matrix"]) == 2

def test_experiment_creation_and_benchmark():
    scorecard = {
        "overall_quality_score": 92.5,
        "statistical_fidelity": {"statistical_fidelity_score": 90.0},
        "constraints": {"valid_pct": 96.0},
        "diversity": {"diversity_score": 98.0},
        "privacy": {"privacy_risk_level": "LOW_RISK"}
    }
    exp = experiment_service.create_experiment(
        user_id="user_123",
        dataset_id="ds_123",
        job_id="job_123",
        model_type="ctgan",
        num_records=1000,
        scorecard=scorecard
    )
    assert exp["overall_quality_score"] == 92.5

    bench = experiment_service.compare_models_benchmark(user_id="user_123")
    assert "ctgan" in bench
    assert bench["ctgan"]["fidelity"] > 0.0

def test_experiments_api_endpoints():
    user_payload = {
        "email": f"exp_tester_{uuid.uuid4().hex[:6]}@example.com",
        "password": "Password123!",
        "full_name": "Experiment Tester"
    }
    client.post("/api/v1/auth/register", json=user_payload)
    login_res = client.post("/api/v1/auth/login", json={"email": user_payload["email"], "password": user_payload["password"]})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    exp_res = client.get("/api/v1/experiments", headers=headers)
    assert exp_res.status_code == 200

    bench_res = client.get("/api/v1/experiments/benchmark", headers=headers)
    assert bench_res.status_code == 200
    assert "ctgan" in bench_res.json()
