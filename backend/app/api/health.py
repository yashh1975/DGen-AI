import sys
from fastapi import APIRouter
from app.core.config import settings
from app.database.mongodb import db_manager

router = APIRouter(tags=["Health"])

@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "environment": settings.ENV,
        "python_version": sys.version,
        "database_mode": "mock_json" if db_manager.use_mock else "mongodb_connected",
        "storage_initialized": settings.STORAGE_DIR.exists(),
        "api_version": "1.0.0"
    }
