from sqlalchemy.orm import Session

from app.modules.catalog.repository import CatalogRepository
from app.modules.catalog.schema import CategoryResponse


class CatalogService:
    def list_skills(self, db: Session) -> list[CategoryResponse]:
        categories = CatalogRepository(db).list_categories_with_skills()
        return [CategoryResponse.model_validate(category) for category in categories]
