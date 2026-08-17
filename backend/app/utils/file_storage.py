import os
import shutil
import uuid
from pathlib import Path
from typing import Tuple
from app.core.config import settings
from app.utils.logging import logger

class FileStorageService:
    def __init__(self):
        settings.init_directories()

    def save_dataset_file(self, content: bytes, filename: str) -> Tuple[str, Path]:
        """Save an uploaded dataset CSV file."""
        file_id = str(uuid.uuid4())
        safe_filename = f"{file_id}_{Path(filename).name}"
        file_path = settings.DATASET_STORAGE_DIR / safe_filename
        with open(file_path, "wb") as f:
            f.write(content)
        logger.info(f"Saved dataset file to: {file_path}")
        return file_id, file_path

    def save_generated_dataset(self, df_content: str, job_id: str) -> Path:
        """Save a generated synthetic dataset CSV with clean line endings."""
        file_path = settings.DATASET_STORAGE_DIR / f"synthetic_{job_id}.csv"
        with open(file_path, "w", encoding="utf-8", newline="") as f:
            f.write(df_content)
        logger.info(f"Saved generated dataset to: {file_path}")
        return file_path

    def save_export_file(self, content: str, filename: str) -> Path:
        """Save an export report (Markdown/JSON/HTML)."""
        file_path = settings.EXPORT_STORAGE_DIR / filename
        with open(file_path, "w", encoding="utf-8", newline="") as f:
            f.write(content)
        return file_path

    def get_file_path(self, relative_or_absolute: str) -> Path:
        """Resolve path safely."""
        path = Path(relative_or_absolute)
        if not path.is_absolute():
            path = settings.STORAGE_DIR / path
        return path

    def file_exists(self, file_path: str) -> bool:
        return Path(file_path).exists()

    def delete_file(self, file_path: str) -> bool:
        try:
            path = Path(file_path)
            if path.exists():
                path.unlink()
                return True
        except Exception as e:
            logger.error(f"Failed to delete file {file_path}: {e}")
        return False

storage_service = FileStorageService()
