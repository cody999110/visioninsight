from fastapi import APIRouter

from app.api.v1 import cleaning, dashboard, datasets, import_templates, management, meta

api_router = APIRouter()
api_router.include_router(import_templates.router, prefix="/import/templates", tags=["import-templates"])
api_router.include_router(datasets.router, prefix="/import/datasets", tags=["datasets"])
api_router.include_router(cleaning.router, prefix="/cleaning", tags=["cleaning"])
api_router.include_router(management.router, prefix="/management", tags=["management"])
api_router.include_router(meta.router, prefix="/meta", tags=["meta"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])