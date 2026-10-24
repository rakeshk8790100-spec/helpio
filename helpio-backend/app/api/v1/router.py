from fastapi import APIRouter
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.catalog import router as catalog_router
from app.api.v1.endpoints.health import router as health_router
from app.api.v1.endpoints.providers import router as providers_router

router = APIRouter(prefix="/v1")
router.include_router(health_router)
router.include_router(auth_router)
router.include_router(catalog_router)
router.include_router(providers_router)
