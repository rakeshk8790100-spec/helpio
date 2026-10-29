from datetime import datetime
from uuid import uuid4

from sqlalchemy import JSON, ForeignKey, Index, SmallInteger, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, UtcDateTime, str_enum, utc_now
from app.modules.auth.model import AuthUser, UserRole

MAX_COMMENT = 500


class JobReview(Base):
    """After the work is approved, the customer rates the pro and the pro rates the customer: one each, final."""

    __tablename__ = "job_reviews"
    __table_args__ = (
        UniqueConstraint("job_id", "author_id", name="ux_job_reviews_job_author"),
        Index("ix_job_reviews_subject_revealed", "subject_id", "revealed_at"),
    )

    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    job_id: Mapped[str] = mapped_column(Uuid(as_uuid=False), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    # Who wrote it, and who it's about
    author_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("auth_users.id", ondelete="CASCADE"), nullable=False
    )
    subject_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("auth_users.id", ondelete="CASCADE"), nullable=False
    )
    # customer (rating the pro) or provider (rating the customer)
    author_role: Mapped[UserRole] = mapped_column(str_enum(UserRole), nullable=False)
    # 1 to 5
    stars: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Not used yet
    tags: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(UtcDateTime, nullable=False, default=utc_now)
    # When the other side can see it; set on saving, so reviews show right away
    revealed_at: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)
    # Hidden by an admin (abuse, contact details): kept for the record, left out of ratings and profiles
    hidden_at: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)
    hidden_by: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("auth_users.id", ondelete="SET NULL"), nullable=True
    )
    hidden_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    author: Mapped[AuthUser] = relationship(foreign_keys=[author_id], lazy="joined")
