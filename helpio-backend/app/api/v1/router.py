from fastapi import APIRouter
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.catalog import router as catalog_router
from app.api.v1.endpoints.customers import router as customers_router
from app.api.v1.endpoints.health import router as health_router
from app.api.v1.endpoints.jobs import router as jobs_router
from app.api.v1.endpoints.notifications import router as notifications_router
from app.api.v1.endpoints.payments import router as payments_router
from app.api.v1.endpoints.providers import router as providers_router
from app.api.v1.endpoints.pros import router as pros_router

router = APIRouter(prefix="/v1")
router.include_router(health_router)
router.include_router(auth_router)
router.include_router(catalog_router)
router.include_router(providers_router)
router.include_router(customers_router)
router.include_router(jobs_router)
router.include_router(payments_router)
router.include_router(notifications_router)
# After /providers/me/*, so `me` is never taken for a provider id
router.include_router(pros_router)
