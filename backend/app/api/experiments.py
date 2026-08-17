from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from app.services.experiment_service import experiment_service
from app.core.security import get_current_user_payload

router = APIRouter(prefix="/experiments", tags=["Experiment Management"])

@router.get("")
async def list_experiments(payload: dict = Depends(get_current_user_payload)):
    user_id = payload.get("sub")
    return experiment_service.list_experiments(user_id=user_id)

@router.get("/benchmark")
async def get_model_benchmark_comparison(payload: dict = Depends(get_current_user_payload)):
    user_id = payload.get("sub")
    return experiment_service.compare_models_benchmark(user_id=user_id)

@router.get("/{experiment_id}")
async def get_experiment_details(
    experiment_id: str,
    payload: dict = Depends(get_current_user_payload)
):
    exp = experiment_service.get_experiment(experiment_id)
    if not exp:
        raise HTTPException(status_code=404, detail=f"Experiment '{experiment_id}' not found.")
    return exp
