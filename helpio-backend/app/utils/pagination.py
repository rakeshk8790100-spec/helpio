"""Numbered pages for admin lists: `?page=1&page_size=25`, answered with the rows and the total."""
from collections.abc import Sequence
from typing import Generic, TypeVar

from fastapi import Query
from pydantic import BaseModel
from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int


class PageParams(BaseModel):
    page: int
    page_size: int


def page_params(
    page: int = Query(default=1, ge=1), page_size: int = Query(default=25, ge=5, le=100)
) -> PageParams:
    return PageParams(page=page, page_size=page_size)


def paginate(db: Session, query: Select, params: PageParams) -> tuple[Sequence, int]:
    """One page of an ordered query, and how many rows match in all."""
    total = db.scalar(select(func.count()).select_from(query.order_by(None).subquery())) or 0
    rows = db.scalars(query.limit(params.page_size).offset((params.page - 1) * params.page_size)).unique().all()
    return rows, total
