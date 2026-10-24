from __future__ import annotations

from sqlalchemy import ForeignKey, SmallInteger, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class CatalogCategory(Base):
    __tablename__ = "catalog_categories"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    name: Mapped[str] = mapped_column(String(60), nullable=False)
    icon: Mapped[str] = mapped_column(String(40), nullable=False)
    sort_order: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)

    skills: Mapped[list[CatalogSkill]] = relationship(
        back_populates="category", order_by="CatalogSkill.sort_order"
    )


class CatalogSkill(Base):
    __tablename__ = "catalog_skills"

    id: Mapped[str] = mapped_column(String(60), primary_key=True)
    category_id: Mapped[str] = mapped_column(
        String(40), ForeignKey("catalog_categories.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    sort_order: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)

    category: Mapped[CatalogCategory] = relationship(back_populates="skills")
