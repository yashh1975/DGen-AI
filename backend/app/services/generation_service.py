import os
import uuid
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
import pandas as pd
from pathlib import Path

from app.services.dataset_service import dataset_service
from app.ml.ctgan_model import CTGANModelEngine
from app.ml.vae_model import VAEModelEngine
from app.ml.conditional_gen import ConditionalGeneratorLayer
from app.utils.file_storage import storage_service
from app.database.mongodb import db_manager
from app.utils.logging import logger

class GenerationService:
    def _enrich_job_doc(self, job_doc: Dict[str, Any]) -> Dict[str, Any]:
        """Attach dataset filename and output synthetic filename to job response dict."""
        if job_doc:
            if "dataset_id" in job_doc:
                ds_meta = dataset_service.get_dataset(job_doc["dataset_id"])
                if ds_meta:
                    job_doc["dataset_filename"] = ds_meta.get("filename", "Banking Dataset")
                else:
                    job_doc["dataset_filename"] = "Banking Dataset"
            
            m_type = job_doc.get("model_type", "ctgan").upper()
            n_rows = job_doc.get("num_records_requested", 1000)
            job_doc["output_filename"] = f"synthetic_{m_type}_{n_rows}_records.csv"
        return job_doc

    def create_generation_job(
        self,
        dataset_id: str,
        user_id: str,
        model_type: str = "ctgan",
        num_records: int = 1000,
        fraud_target_ratio: Optional[float] = None,
        random_seed: int = 42
    ) -> Dict[str, Any]:
        """Create a new synthetic data generation job record."""
        job_id = str(uuid.uuid4())
        now_str = datetime.now(timezone.utc).isoformat()

        ds_meta = dataset_service.get_dataset(dataset_id)
        ds_name = ds_meta.get("filename", "Banking Dataset") if ds_meta else "Banking Dataset"

        job_doc = {
            "job_id": job_id,
            "dataset_id": dataset_id,
            "dataset_filename": ds_name,
            "user_id": user_id,
            "model_type": model_type.lower(),
            "num_records_requested": num_records,
            "fraud_target_ratio": fraud_target_ratio,
            "random_seed": random_seed,
            "status": "queued",
            "created_at": now_str,
            "completed_at": None,
            "synthetic_dataset_path": None,
            "achieved_fraud_ratio": None,
            "error_message": None
        }

        jobs_col = db_manager.get_collection("generation_jobs")
        jobs_col.insert_one(job_doc)
        return job_doc

    def run_generation_pipeline(self, job_id: str):
        """Execute model training and synthetic data sampling in background worker thread."""
        jobs_col = db_manager.get_collection("generation_jobs")
        job = jobs_col.find_one({"job_id": job_id})
        if not job:
            return

        try:
            # 1. Update status -> training
            jobs_col.update_one({"job_id": job_id}, {"$set": {"status": "training"}})

            dataset_id = job["dataset_id"]
            raw_df = dataset_service.get_dataset_dataframe(dataset_id)
            model_type = job["model_type"]
            num_records = job["num_records_requested"]
            seed = job["random_seed"]
            fraud_target_ratio = job.get("fraud_target_ratio")

            # 2. Train Generative Engine (optimized for lightning-fast responsive cloud execution)
            if model_type == "vae":
                engine = VAEModelEngine(epochs=5, batch_size=256, random_seed=seed)
                engine.fit(raw_df)
            else: # default CTGAN
                engine = CTGANModelEngine(epochs=5, batch_size=256, random_seed=seed)
                engine.fit(raw_df)

            # 3. Update status -> generating
            jobs_col.update_one({"job_id": job_id}, {"$set": {"status": "generating"}})

            # 4. Generate Records
            if fraud_target_ratio is not None:
                cond_layer = ConditionalGeneratorLayer(engine)
                synthetic_df = cond_layer.generate_conditional(
                    num_records=num_records,
                    fraud_target_ratio=fraud_target_ratio,
                    target_column="is_fraud"
                )
            else:
                synthetic_df = engine.sample(num_records)

            # Apply Banking Constraint Repair
            from app.services.constraint_service import constraint_engine
            synthetic_df = constraint_engine.repair_constraints(synthetic_df)

            # Apply Diversity & Uniqueness Filter (Deduplicate synthetic feature combinations)
            feature_cols = [c for c in synthetic_df.columns if "id" not in c.lower()]
            if feature_cols:
                synthetic_df = synthetic_df.drop_duplicates(subset=feature_cols).reset_index(drop=True)

            # STRICT SCHEMA & FORMAT ALIGNMENT
            # 1. Order columns exactly as in the source dataset
            source_cols = list(raw_df.columns)
            aligned_cols = [c for c in source_cols if c in synthetic_df.columns]
            extra_cols = [c for c in synthetic_df.columns if c not in source_cols]
            synthetic_df = synthetic_df[aligned_cols + extra_cols]

            # 2. Strictly round all float columns to 2 decimals
            for col in synthetic_df.select_dtypes(include=[np.floating]).columns:
                synthetic_df[col] = synthetic_df[col].round(2)

            # 3. Ensure integer columns are clean integers
            for col in ["age", "transaction_hour", "is_international", "is_fraud"]:
                if col in synthetic_df.columns:
                    synthetic_df[col] = np.clip(np.round(pd.to_numeric(synthetic_df[col], errors="coerce").fillna(0)), 0, 100).astype(int)

            achieved_ratio = None
            if "is_fraud" in synthetic_df.columns:
                achieved_ratio = float(np.round(synthetic_df["is_fraud"].mean(), 4))

            # 5. Save synthetic CSV
            csv_content = synthetic_df.to_csv(index=False, lineterminator="\n", float_format="%.2f")
            saved_path = storage_service.save_generated_dataset(csv_content, job_id)

            now_str = datetime.now(timezone.utc).isoformat()
            jobs_col.update_one(
                {"job_id": job_id},
                {"$set": {
                    "status": "completed",
                    "completed_at": now_str,
                    "synthetic_dataset_path": str(saved_path),
                    "achieved_fraud_ratio": achieved_ratio
                }}
            )
            logger.info(f"Generation job {job_id} completed successfully ({len(synthetic_df)} records).")

            # 6. Auto-evaluate and register Experiment scorecard
            try:
                from app.services.statistical_service import statistical_fidelity_engine
                from app.services.diversity_service import diversity_engine
                from app.services.privacy_service import privacy_engine
                from app.services.experiment_service import experiment_service

                constraints_res = constraint_engine.validate_constraints(synthetic_df)
                statistical_res = statistical_fidelity_engine.evaluate_fidelity(raw_df, synthetic_df)
                diversity_res = diversity_engine.evaluate_diversity(synthetic_df)
                privacy_res = privacy_engine.evaluate_privacy(raw_df, synthetic_df)

                overall_score = round(
                    0.40 * statistical_res.get("statistical_fidelity_score", 0.0) +
                    0.30 * constraints_res.get("valid_pct", 0.0) +
                    0.15 * diversity_res.get("diversity_score", 0.0) +
                    0.15 * privacy_res.get("privacy_score", 0.0),
                    2
                )

                scorecard = {
                    "overall_quality_score": overall_score,
                    "statistical_fidelity": statistical_res,
                    "constraints": constraints_res,
                    "diversity": diversity_res,
                    "privacy": privacy_res
                }

                experiment_service.create_experiment(
                    user_id=job["user_id"],
                    dataset_id=dataset_id,
                    job_id=job_id,
                    model_type=model_type,
                    num_records=len(synthetic_df),
                    scorecard=scorecard
                )
                logger.info(f"Auto-evaluated and registered Experiment for job {job_id}")
            except Exception as eval_err:
                logger.warning(f"Could not auto-evaluate job {job_id}: {eval_err}")

        except Exception as e:
            logger.exception(f"Generation job {job_id} failed: {e}")
            jobs_col.update_one(
                {"job_id": job_id},
                {"$set": {
                    "status": "failed",
                    "error_message": str(e)
                }}
            )

    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        jobs_col = db_manager.get_collection("generation_jobs")
        job = jobs_col.find_one({"job_id": job_id})
        return self._enrich_job_doc(job) if job else None

    def list_jobs(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        jobs_col = db_manager.get_collection("generation_jobs")
        if user_id:
            jobs = jobs_col.find({"user_id": user_id})
        else:
            jobs = jobs_col.find({})
        return [self._enrich_job_doc(j) for j in jobs]

    def delete_job(self, job_id: str, user_id: Optional[str] = None) -> bool:
        """Delete generation job metadata and associated synthetic CSV file."""
        jobs_col = db_manager.get_collection("generation_jobs")
        job = jobs_col.find_one({"job_id": job_id})
        if not job:
            return False

        # Delete physical synthetic file from storage disk if exists
        file_path_str = job.get("synthetic_dataset_path")
        if file_path_str:
            try:
                p = Path(file_path_str)
                if p.exists():
                    p.unlink()
                    logger.info(f"Deleted synthetic dataset file: {file_path_str}")
            except Exception as e:
                logger.warning(f"Failed deleting synthetic dataset file {file_path_str}: {e}")

        # Delete job document from database
        res = jobs_col.delete_one({"job_id": job_id})
        if isinstance(res, dict):
            return res.get("deleted_count", 0) > 0
        return bool(res)

generation_service = GenerationService()
