from typing import List, Optional
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from fastapi.responses import FileResponse
from app.schemas.dataset import GenerationRequest, GenerationJobResponse
from app.services.generation_service import generation_service
from app.core.security import get_current_user_payload

router = APIRouter(prefix="/generation", tags=["Generative AI Engine"])

@router.post("", response_model=GenerationJobResponse, status_code=status.HTTP_201_CREATED)
async def create_generation_job(
    request: GenerationRequest,
    background_tasks: BackgroundTasks,
    payload: dict = Depends(get_current_user_payload)
):
    user_id = payload.get("sub")
    job = generation_service.create_generation_job(
        dataset_id=request.dataset_id,
        user_id=user_id,
        model_type=request.model_type,
        num_records=request.num_records,
        fraud_target_ratio=request.fraud_target_ratio,
        random_seed=request.random_seed or 42
    )
    background_tasks.add_task(generation_service.run_generation_pipeline, job["job_id"])
    return job

@router.get("", response_model=List[GenerationJobResponse])
async def list_generation_jobs(payload: dict = Depends(get_current_user_payload)):
    user_id = payload.get("sub")
    return generation_service.list_jobs(user_id=user_id)

@router.get("/{job_id}", response_model=GenerationJobResponse)
async def get_generation_job_status(
    job_id: str,
    payload: dict = Depends(get_current_user_payload)
):
    job = generation_service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Generation job '{job_id}' not found.")
    return job

@router.get("/{job_id}/download")
async def download_synthetic_dataset(
    job_id: str,
    payload: dict = Depends(get_current_user_payload)
):
    job = generation_service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Generation job '{job_id}' not found.")

    if job["status"] != "completed":
        raise HTTPException(status_code=400, detail="Synthetic dataset is not ready for download yet.")

    file_path = Path(job.get("synthetic_dataset_path", ""))
    if not file_path.exists():
        # Auto self-heal synthetic dataset on cloud ephemeral restarts
        try:
            generation_service.get_synthetic_dataframe(job_id)
            updated_job = generation_service.get_job(job_id)
            file_path = Path(updated_job.get("synthetic_dataset_path", ""))
        except Exception as heal_err:
            raise HTTPException(status_code=404, detail=f"Synthetic dataset file missing on disk: {heal_err}")

    m_type = job.get("model_type", "ctgan").upper()
    n_rows = job.get("num_records_requested", 1000)
    filename = job.get("output_filename") or f"synthetic_{m_type}_{n_rows}_records.csv"

    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.delete("/{job_id}", status_code=status.HTTP_200_OK)
async def delete_generation_job(
    job_id: str,
    payload: dict = Depends(get_current_user_payload)
):
    user_id = payload.get("sub")
    success = generation_service.delete_job(job_id, user_id=user_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Generation job '{job_id}' not found or already deleted.")
    return {"success": True, "message": f"Generation job '{job_id}' deleted successfully."}
