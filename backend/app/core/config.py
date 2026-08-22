import os
from pathlib import Path
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    APP_NAME: str = "DGen AI"
    ENV: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "127.0.0.1"
    API_PREFIX: str = "/api/v1"

    # Security
    JWT_SECRET: str = "dgen-ai-super-secret-key-change-in-production-2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # Database
    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "dgen_ai"
    USE_MONGO_MOCK: bool = True

    # Storage Paths
    STORAGE_DIR: Path = BASE_DIR / "storage"
    DATASET_STORAGE_DIR: Path = BASE_DIR / "storage" / "datasets"
    MODEL_STORAGE_DIR: Path = BASE_DIR / "storage" / "models"
    EXPORT_STORAGE_DIR: Path = BASE_DIR / "storage" / "exports"
    REPORT_STORAGE_DIR: Path = BASE_DIR / "storage" / "reports"

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "https://*.pages.dev",
        "https://*.vercel.app",
        "*"
    ]

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    def init_directories(self):
        """Ensure all storage directories exist."""
        self.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
        self.DATASET_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
        self.MODEL_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
        self.EXPORT_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
        self.REPORT_STORAGE_DIR.mkdir(parents=True, exist_ok=True)

settings = Settings()
settings.init_directories()
