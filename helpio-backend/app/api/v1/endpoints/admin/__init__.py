"""The admin console's API, all under /api/v1/admin."""
from fastapi import APIRouter

from app.api.v1.endpoints.admin.access import router as access_router
from app.api.v1.endpoints.admin.admins import router as admins_router
from app.api.v1.endpoints.admin.approvals import router as approvals_router
from app.api.v1.endpoints.admin.operations import router as operations_router
from app.api.v1.endpoints.admin.system import router as system_router

router = APIRouter()
router.include_router(access_router)
router.include_router(admins_router)
router.include_router(approvals_router)
router.include_router(system_router)
router.include_router(operations_router)
