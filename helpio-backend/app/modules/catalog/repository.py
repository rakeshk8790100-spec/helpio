from collections.abc import Collection, Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.modules.catalog.model import CatalogCategory, CatalogSkill


class CatalogRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_categories_with_skills(self, include_inactive: bool = False) -> Sequence[CatalogCategory]:
        """Pickers see only what's switched on; the admin console sees everything."""
        query = select(CatalogCategory).order_by(CatalogCategory.sort_order, CatalogCategory.name)
        if include_inactive:
            return self.db.scalars(query.options(selectinload(CatalogCategory.skills))).all()
        return self.db.scalars(
            query.where(CatalogCategory.is_active.is_(True))
            .options(selectinload(CatalogCategory.skills.and_(CatalogSkill.is_active.is_(True))))
        ).all()

    def existing_skill_ids(self, skill_ids: Collection[str]) -> set[str]:
        return set(self.db.scalars(select(CatalogSkill.id).where(CatalogSkill.id.in_(skill_ids))))
