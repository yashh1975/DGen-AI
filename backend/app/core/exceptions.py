from fastapi import Request, status
from fastapi.responses import JSONResponse
import logging

logger = logging.getLogger("dgen.exceptions")

class DGenException(Exception):
    def __init__(self, message: str, status_code: int = status.HTTP_400_BAD_REQUEST, details: dict = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)

class DatasetNotFoundException(DGenException):
    def __init__(self, dataset_id: str):
        super().__init__(
            message=f"Dataset with ID '{dataset_id}' was not found.",
            status_code=status.HTTP_404_NOT_FOUND
        )

class ModelNotFoundException(DGenException):
    def __init__(self, model_id: str):
        super().__init__(
            message=f"Generative model with ID '{model_id}' was not found.",
            status_code=status.HTTP_404_NOT_FOUND
        )

class GenerationFailedException(DGenException):
    def __init__(self, reason: str):
        super().__init__(
            message=f"Synthetic data generation failed: {reason}",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

async def dgen_exception_handler(request: Request, exc: DGenException):
    logger.error(f"DGenException on {request.url.path}: {exc.message}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.message,
            "details": exc.details
        }
    )


async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled exception on {request.url.path}: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": "An unexpected server error occurred. Please check server logs.",
            "detail": str(exc) if logging.getLogger().isEnabledFor(logging.DEBUG) else None
        }
    )
