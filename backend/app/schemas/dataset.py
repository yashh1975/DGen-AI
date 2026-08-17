from datetime import datetime
from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field

class DatasetMetaResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    filename: str
    row_count: int
    column_count: int
    file_size_bytes: int
    upload_timestamp: str
    target_fraud_column: Optional[str] = None
    columns: List[str] = []
    numerical_columns: List[str] = []
    categorical_columns: List[str] = []
    datetime_columns: List[str] = []

class DatasetProfileResponse(BaseModel):
    dataset_id: str
    summary: Dict[str, Any]
    numerical_analysis: Dict[str, Any]
    categorical_analysis: Dict[str, Any]
    correlation_matrix: Dict[str, Dict[str, float]]
    detected_target_column: Optional[str] = None
    missing_values_breakdown: Dict[str, int]
    duplicate_rows_count: int

class GenerationRequest(BaseModel):
    dataset_id: str
    model_type: str = Field(..., description="ctgan | vae | conditional")
    num_records: int = Field(1000, ge=10, le=500000)
    conditional_config: Optional[Dict[str, Any]] = None
    fraud_target_ratio: Optional[float] = Field(None, ge=0.0, le=1.0)
    random_seed: Optional[int] = 42

class GenerationJobResponse(BaseModel):
    job_id: str
    dataset_id: str
    dataset_filename: Optional[str] = None
    output_filename: Optional[str] = None
    model_type: str
    num_records_requested: int
    status: str
    created_at: str
    completed_at: Optional[str] = None
    synthetic_dataset_path: Optional[str] = None
    error_message: Optional[str] = None
