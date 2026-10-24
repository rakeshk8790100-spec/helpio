from collections.abc import Collection, Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.modules.catalog.model import CatalogCategory, CatalogSkill


class CatalogRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_categories_with_skills(self) -> Sequence[CatalogCategory]:
        return self.db.scalars(
            select(CatalogCategory)
            .options(selectinload(CatalogCategory.skills))
            .order_by(CatalogCategory.sort_order, CatalogCategory.name)
        ).all()

    def existing_skill_ids(self, skill_ids: Collection[str]) -> set[str]:
        return set(self.db.scalars(select(CatalogSkill.id).where(CatalogSkill.id.in_(skill_ids))))
