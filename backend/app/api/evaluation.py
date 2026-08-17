import asyncio
import pandas as pd
from pathlib import Path
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.services.dataset_service import dataset_service
from app.services.generation_service import generation_service
from app.services.constraint_service import constraint_engine
from app.services.statistical_service import statistical_fidelity_engine
from app.services.diversity_service import diversity_engine
from app.services.privacy_service import privacy_engine
from app.core.security import get_current_user_payload

router = APIRouter(prefix="/evaluation", tags=["Quality & Privacy Evaluation"])

def _get_eval_dfs(dataset_id: Optional[str], job_id: Optional[str], user_id: Optional[str] = None):
    if not job_id and not dataset_id:
        jobs = generation_service.list_jobs(user_id=user_id)
        completed = [j for j in jobs if j.get("status") == "completed" and j.get("synthetic_dataset_path")]
        if completed:
            job_id = completed[0]["job_id"]
        else:
            datasets = dataset_service.list_datasets(user_id=user_id)
            if datasets:
                dataset_id = datasets[0]["id"]
            else:
                raise HTTPException(status_code=400, detail="No synthetic jobs or banking datasets available for evaluation.")

    if job_id:
        job = generation_service.get_job(job_id)
        if not job or not job.get("synthetic_dataset_path"):
            raise HTTPException(status_code=404, detail="Synthetic dataset for job not found or not completed.")
        synthetic_df = pd.read_csv(job["synthetic_dataset_path"])
        real_df = dataset_service.get_dataset_dataframe(job["dataset_id"])
    else:
        synthetic_df = dataset_service.get_dataset_dataframe(dataset_id)
        real_df = synthetic_df

    return real_df, synthetic_df

@router.post("/constraints")
async def evaluate_constraints(
    dataset_id: Optional[str] = Query(None),
    job_id: Optional[str] = Query(None),
    payload: dict = Depends(get_current_user_payload)
):
    """Evaluate banking logical rules & constraints."""
    user_id = payload.get("sub")
    _, synthetic_df = _get_eval_dfs(dataset_id, job_id, user_id=user_id)
    return await asyncio.to_thread(constraint_engine.validate_constraints, synthetic_df)

@router.post("/statistical")
async def evaluate_statistical_fidelity(
    dataset_id: Optional[str] = Query(None),
    job_id: Optional[str] = Query(None),
    payload: dict = Depends(get_current_user_payload)
):
    """Evaluate statistical fidelity metrics (KS-test, Wasserstein, correlation deltas)."""
    user_id = payload.get("sub")
    real_df, synthetic_df = _get_eval_dfs(dataset_id, job_id, user_id=user_id)
    return await asyncio.to_thread(statistical_fidelity_engine.evaluate_fidelity, real_df, synthetic_df)

@router.post("/privacy")
async def evaluate_privacy_risk(
    dataset_id: Optional[str] = Query(None),
    job_id: Optional[str] = Query(None),
    payload: dict = Depends(get_current_user_payload)
):
    """Evaluate academic privacy risk indicators & Distance to Closest Record (DCR)."""
    user_id = payload.get("sub")
    real_df, synthetic_df = _get_eval_dfs(dataset_id, job_id, user_id=user_id)
    return await asyncio.to_thread(privacy_engine.evaluate_privacy, real_df, synthetic_df)

@router.post("/full")
async def evaluate_full_scorecard(
    dataset_id: Optional[str] = Query(None),
    job_id: Optional[str] = Query(None),
    payload: dict = Depends(get_current_user_payload)
):
    """Generate comprehensive quality, constraint, diversity, and privacy evaluation scorecard."""
    user_id = payload.get("sub")
    real_df, synthetic_df = _get_eval_dfs(dataset_id, job_id, user_id=user_id)

    def _compute():
        constraints_res = constraint_engine.validate_constraints(synthetic_df)
        statistical_res = statistical_fidelity_engine.evaluate_fidelity(real_df, synthetic_df)
        diversity_res = diversity_engine.evaluate_diversity(synthetic_df)
        privacy_res = privacy_engine.evaluate_privacy(real_df, synthetic_df)

        overall_score = round(
            0.40 * statistical_res["statistical_fidelity_score"] +
            0.30 * constraints_res["valid_pct"] +
            0.15 * diversity_res["diversity_score"] +
            0.15 * privacy_res["privacy_score"],
            2
        )
        return {
            "overall_quality_score": overall_score,
            "constraints": constraints_res,
            "statistical_fidelity": statistical_res,
            "diversity": diversity_res,
            "privacy": privacy_res
        }

    return await asyncio.to_thread(_compute)

@router.post("/fraud")
async def evaluate_fraud_ml_utility(
    dataset_id: Optional[str] = Query(None),
    job_id: Optional[str] = Query(None),
    target_column: Optional[str] = Query(None),
    payload: dict = Depends(get_current_user_payload)
):
    """Train downstream fraud classifiers on Real, Synthetic, and Combined data, evaluating on an independent Real test set."""
    from app.services.fraud_service import fraud_ml_engine
    from app.services.experiment_service import experiment_service
    user_id = payload.get("sub")
    real_df, synthetic_df = _get_eval_dfs(dataset_id, job_id, user_id=user_id)
    
    results = await asyncio.to_thread(fraud_ml_engine.evaluate_fraud_utility, real_df, synthetic_df, target_col=target_column)

    # Auto-save experiment record in background thread
    try:
        if job_id:
            job = generation_service.get_job(job_id)
            if job:
                scorecard = {
                    "overall_quality_score": results["experiments"]["real_plus_synthetic"].get("f1_score", 0.0),
                    "statistical_fidelity": {"statistical_fidelity_score": 0.0},
                    "constraints": {"valid_pct": 0.0},
                    "diversity": {"diversity_score": 0.0},
                    "privacy": {"privacy_risk_level": "LOW"}
                }
                try:
                    constraints_res = constraint_engine.validate_constraints(synthetic_df)
                    statistical_res = statistical_fidelity_engine.evaluate_fidelity(real_df, synthetic_df)
                    diversity_res = diversity_engine.evaluate_diversity(synthetic_df)
                    privacy_res = privacy_engine.evaluate_privacy(real_df, synthetic_df)
                    overall_score = round(
                        0.40 * statistical_res["statistical_fidelity_score"] +
                        0.30 * constraints_res["valid_pct"] +
                        0.15 * diversity_res["diversity_score"] +
                        0.15 * privacy_res["privacy_score"], 2
                    )
                    scorecard = {
                        "overall_quality_score": overall_score,
                        "statistical_fidelity": statistical_res,
                        "constraints": constraints_res,
                        "diversity": diversity_res,
                        "privacy": privacy_res
                    }
                except Exception:
                    pass

                experiment_service.create_experiment(
                    user_id=user_id,
                    dataset_id=job.get("dataset_id", ""),
                    job_id=job_id,
                    model_type=job.get("model_type", "ctgan"),
                    num_records=job.get("num_records_requested", 0),
                    scorecard=scorecard,
                    fraud_ml_metrics=results
                )
    except Exception as save_err:
        from app.utils.logging import logger
        logger.warning(f"Could not auto-save experiment after fraud ML run: {save_err}")

    return results

@router.get("/report/export")
async def export_academic_report_package(
    dataset_id: Optional[str] = Query(None),
    job_id: Optional[str] = Query(None),
    payload: dict = Depends(get_current_user_payload)
):
    """Generate and download complete Academic Package ZIP in a background thread."""
    from fastapi.responses import FileResponse
    from app.services.report_service import report_exporter_service

    try:
        zip_path = await asyncio.to_thread(report_exporter_service.export_report_package_zip, dataset_id, job_id)
        filename = Path(zip_path).name
        return FileResponse(
            zip_path,
            media_type="application/zip",
            filename=filename,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except Exception as e:
        from app.utils.logging import logger
        logger.error(f"Error exporting report package: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))
