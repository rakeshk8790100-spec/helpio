from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.modules.catalog.dependencies import get_catalog_service
from app.modules.catalog.schema import CategoryResponse
from app.modules.catalog.service import CatalogService

router = APIRouter(prefix="/catalog", tags=["catalog"])


@router.get("/skills", response_model=list[CategoryResponse])
def list_skills(
    response: Response,
    db: Session = Depends(get_db),
    service: CatalogService = Depends(get_catalog_service),
) -> list[CategoryResponse]:
    """Public skills catalogue, grouped by category."""
    response.headers["Cache-Control"] = "public, max-age=300"
    return service.list_skills(db)
