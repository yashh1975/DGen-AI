from typing import List, Optional, Dict, Any
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query, status
from app.schemas.dataset import DatasetMetaResponse, DatasetProfileResponse
from app.services.dataset_service import dataset_service
from app.services.profiling_service import profiling_service
from app.services.preprocessing_service import preprocessing_service
from app.core.security import get_current_user_payload

router = APIRouter(prefix="/datasets", tags=["Dataset Engine"])

@router.post("/upload", response_model=DatasetMetaResponse, status_code=status.HTTP_201_CREATED)
async def upload_dataset(
    file: UploadFile = File(...),
    payload: dict = Depends(get_current_user_payload)
):
    user_id = payload.get("sub")
    dataset_doc = await dataset_service.upload_dataset(file, user_id=user_id)
    return dataset_doc

@router.get("", response_model=List[DatasetMetaResponse])
async def list_datasets(payload: dict = Depends(get_current_user_payload)):
    user_id = payload.get("sub")
    return dataset_service.list_datasets(user_id=user_id)

@router.get("/{dataset_id}", response_model=DatasetMetaResponse)
async def get_dataset_metadata(
    dataset_id: str,
    payload: dict = Depends(get_current_user_payload)
):
    dataset = dataset_service.get_dataset(dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail=f"Dataset with ID '{dataset_id}' not found.")
    return dataset

@router.get("/{dataset_id}/sample")
async def get_dataset_sample(
    dataset_id: str,
    rows: int = Query(50, ge=1, le=200),
    payload: dict = Depends(get_current_user_payload)
):
    return dataset_service.get_dataset_sample(dataset_id, rows=rows)

@router.post("/{dataset_id}/profile", response_model=DatasetProfileResponse)
async def profile_dataset(
    dataset_id: str,
    payload: dict = Depends(get_current_user_payload)
):
    dataset = dataset_service.get_dataset(dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail=f"Dataset with ID '{dataset_id}' not found.")
    return profiling_service.profile_dataset(dataset_id)

@router.post("/{dataset_id}/preprocess")
async def preprocess_dataset(
    dataset_id: str,
    impute_strategy: str = Query("median", pattern="^(median|mean)$"),
    scaling_strategy: str = Query("minmax", pattern="^(minmax|standard|none)$"),
    encode_categorical: bool = Query(True),
    payload: dict = Depends(get_current_user_payload)
):
    dataset = dataset_service.get_dataset(dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail=f"Dataset with ID '{dataset_id}' not found.")
    return preprocessing_service.preprocess_dataset(
        dataset_id=dataset_id,
        impute_strategy=impute_strategy,
        scaling_strategy=scaling_strategy,
        encode_categorical=encode_categorical
    )

@router.post("/seed-benchmark", response_model=DatasetMetaResponse, status_code=status.HTTP_201_CREATED)
async def seed_benchmark_dataset(payload: dict = Depends(get_current_user_payload)):
    user_id = payload.get("sub")
    doc = dataset_service.seed_user_sample_dataset(user_id=user_id)
    if not doc:
        raise HTTPException(status_code=400, detail="Could not seed sample banking dataset.")
    return doc

@router.delete("/{dataset_id}")
async def delete_dataset(
    dataset_id: str,
    payload: dict = Depends(get_current_user_payload)
):
    user_id = payload.get("sub")
    success = dataset_service.delete_dataset(dataset_id, user_id=user_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Dataset with ID '{dataset_id}' not found or access denied.")
    return {"success": True, "message": f"Dataset '{dataset_id}' deleted."}
