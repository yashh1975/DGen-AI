import uuid
import time
import pandas as pd
from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app
from app.ml.ctgan_model import CTGANModelEngine
from app.ml.vae_model import VAEModelEngine
from app.ml.conditional_gen import ConditionalGeneratorLayer

client = TestClient(app)

def test_ctgan_engine_fit_and_sample():
    sample_csv_path = Path(__file__).resolve().parent.parent.parent / "data" / "sample_banking_transactions.csv"
    df = pd.read_csv(sample_csv_path, nrows=200)

    engine = CTGANModelEngine(epochs=2, batch_size=50, random_seed=42)
    engine.fit(df)
    synthetic_df = engine.sample(num_records=50)

    assert len(synthetic_df) == 50
    assert "amount" in synthetic_df.columns
    assert "account_type" in synthetic_df.columns

def test_pytorch_vae_engine_fit_and_sample():
    sample_csv_path = Path(__file__).resolve().parent.parent.parent / "data" / "sample_banking_transactions.csv"
    df = pd.read_csv(sample_csv_path, nrows=200)

    engine = VAEModelEngine(latent_dim=8, epochs=5, batch_size=64, random_seed=42)
    engine.fit(df)
    synthetic_df = engine.sample(num_records=50)

    assert len(synthetic_df) == 50
    assert "amount" in synthetic_df.columns
    assert "is_fraud" in synthetic_df.columns

def test_conditional_generation_layer():
    sample_csv_path = Path(__file__).resolve().parent.parent.parent / "data" / "sample_banking_transactions.csv"
    df = pd.read_csv(sample_csv_path, nrows=200)

    engine = VAEModelEngine(latent_dim=8, epochs=5, batch_size=64, random_seed=42)
    engine.fit(df)

    cond_layer = ConditionalGeneratorLayer(engine)
    target_ratio = 0.20 # 20% fraud target
    conditional_df = cond_layer.generate_conditional(num_records=100, fraud_target_ratio=target_ratio, target_column="is_fraud")

    assert len(conditional_df) == 100
    actual_ratio = conditional_df["is_fraud"].mean()
    assert abs(actual_ratio - target_ratio) < 0.05

def test_generation_api_workflow():
    user_payload = {
        "email": f"gen_tester_{uuid.uuid4().hex[:6]}@example.com",
        "password": "Password123!",
        "full_name": "Generator Tester"
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

    # Submit Generation Job
    gen_payload = {
        "dataset_id": dataset_id,
        "model_type": "vae",
        "num_records": 100,
        "fraud_target_ratio": 0.10,
        "random_seed": 42
    }
    job_res = client.post("/api/v1/generation", json=gen_payload, headers=headers)
    assert job_res.status_code == 201
    job_id = job_res.json()["job_id"]

    # Wait for job completion
    completed = False
    for _ in range(30):
        status_res = client.get(f"/api/v1/generation/{job_id}", headers=headers)
        status_data = status_res.json()
        if status_data["status"] == "completed":
            completed = True
            break
        time.sleep(0.5)

    assert completed, "Generation job should complete asynchronously within timeout"

    # Download synthetic CSV
    download_res = client.get(f"/api/v1/generation/{job_id}/download", headers=headers)
    assert download_res.status_code == 200
    assert "text/csv" in download_res.headers["content-type"]
