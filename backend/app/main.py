from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.exceptions import DGenException, dgen_exception_handler, generic_exception_handler
from app.database.mongodb import db_manager
from app.utils.logging import logger
from app.api.health import router as health_router
from app.api.auth import router as auth_router
from app.api.datasets import router as datasets_router
from app.api.generation import router as generation_router
from app.api.evaluation import router as evaluation_router
from app.api.experiments import router as experiments_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info(f"Starting {settings.APP_NAME} backend...")
    try:
        import torch
        torch.set_num_threads(2)
    except Exception:
        pass
    db_manager.connect()
    yield
    # Shutdown
    logger.info(f"Shutting down {settings.APP_NAME} backend...")

app = FastAPI(
    title=settings.APP_NAME,
    description="DGen AI - Privacy-Preserving, Statistically Accurate and Fraud-Aware Synthetic Banking Transaction Data Generator Platform API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Configuration - support Cloudflare Pages (*.pages.dev), Render, Vercel, and local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Exception Handlers
app.add_exception_handler(DGenException, dgen_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# Mount Routers
app.include_router(health_router, prefix=settings.API_PREFIX)
app.include_router(auth_router, prefix=settings.API_PREFIX)
app.include_router(datasets_router, prefix=settings.API_PREFIX)
app.include_router(generation_router, prefix=settings.API_PREFIX)
app.include_router(evaluation_router, prefix=settings.API_PREFIX)
app.include_router(experiments_router, prefix=settings.API_PREFIX)

@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "status": "online",
        "documentation": "/docs",
        "api_prefix": settings.API_PREFIX
    }
