"""Reviews and the service catalog in the admin console. Nothing is deleted: reviews are hidden, catalog items switched off."""
import re

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.core.database import utc_now
from app.modules.admin import audit
from app.modules.admin.audit import AuditAction, RequestInfo
from app.modules.admin.exceptions import CatalogIdTakenError, CatalogItemNotFoundError, ReviewNotFoundError
from app.modules.admin.schema import (
    AdminCategoryResponse,
    AdminReviewRowResponse,
    AdminSkillResponse,
    ApproveServiceRequest,
    SaveCategoryRequest,
    SaveSkillRequest,
    ServiceRequestRowResponse,
)
from app.modules.auth.model import AuthUser
from app.modules.catalog.model import CatalogCategory, CatalogSkill
from app.modules.catalog.repository import CatalogRepository
from app.modules.customers.model import CustomerFavoriteSkill, CustomerServiceRequest, ServiceRequestStatus
from app.modules.jobs.model import Job
from app.modules.providers.model import ProviderSkill
from app.modules.reviews.model import JobReview
from app.utils.pagination import Page, PageParams, paginate


def slug(text: str) -> str:
    """"Tap & leak repair" → "tap-leak-repair"."""
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def person(user: AuthUser | None) -> str:
    return (user.name or user.email) if user else "Unknown"


class ModerationService:
    # ----- Reviews -----

    def reviews(
        self, db: Session, params: PageParams, *, hidden: bool | None = None, stars: int | None = None
    ) -> Page[AdminReviewRowResponse]:
        query = select(JobReview)
        if hidden is not None:
            query = query.where(JobReview.hidden_at.is_not(None) if hidden else JobReview.hidden_at.is_(None))
        if stars is not None:
            query = query.where(JobReview.stars == stars)
        rows, total = paginate(db, query.order_by(JobReview.created_at.desc()), params)
        return Page[AdminReviewRowResponse](items=self._review_rows(db, rows), total=total, page=params.page, page_size=params.page_size)

    def set_hidden(
        self, db: Session, admin: AuthUser, review_id: str, hidden: bool, reason: str | None, request: RequestInfo
    ) -> AdminReviewRowResponse:
        review = db.get(JobReview, review_id)
        if review is None:
            raise ReviewNotFoundError
        if (review.hidden_at is not None) != hidden:
            review.hidden_at, review.hidden_by, review.hidden_reason = (utc_now(), admin.id, reason) if hidden else (None, None, None)
            audit.record(
                db, action=AuditAction.REVIEW_HIDDEN if hidden else AuditAction.REVIEW_SHOWN, admin=admin,
                target_type="review", target_id=review.id,
                summary=f"{'Hid' if hidden else 'Showed again'} a {review.stars}-star review by {person(review.author)}",
                request=request, **({"reason": reason} if reason else {}),
            )
            db.commit()
        return self._review_rows(db, [review])[0]

    # ----- Catalog -----

    def catalog(self, db: Session) -> list[AdminCategoryResponse]:
        providers = dict(db.execute(select(ProviderSkill.skill_id, func.count()).group_by(ProviderSkill.skill_id)).all())
        jobs = dict(db.execute(select(Job.category_id, func.count()).group_by(Job.category_id)).all())
        return [
            AdminCategoryResponse(
                id=c.id, name=c.name, icon=c.icon, sort_order=c.sort_order, is_active=c.is_active, jobs=jobs.get(c.id, 0),
                skills=[
                    AdminSkillResponse(id=s.id, name=s.name, sort_order=s.sort_order, is_active=s.is_active, providers=providers.get(s.id, 0))
                    for s in c.skills
                ],
            )
            for c in CatalogRepository(db).list_categories_with_skills(include_inactive=True)
        ]

    def save_category(
        self, db: Session, admin: AuthUser, category_id: str | None, payload: SaveCategoryRequest, request: RequestInfo
    ) -> list[AdminCategoryResponse]:
        if category_id is None:
            new_id = slug(payload.name)[:40]
            if not new_id or db.get(CatalogCategory, new_id) is not None:
                raise CatalogIdTakenError
            category = CatalogCategory(id=new_id)
            db.add(category)
        else:
            category = db.get(CatalogCategory, category_id)
            if category is None:
                raise CatalogItemNotFoundError
        category.name, category.icon = payload.name, payload.icon
        category.sort_order, category.is_active = payload.sort_order, payload.is_active
        audit.record(
            db, action=AuditAction.CATALOG_CHANGED, admin=admin, target_type="category", target_id=category.id,
            summary=f"{'Added' if category_id is None else 'Changed'} category {payload.name}"
            + ("" if payload.is_active else " (switched off)"), request=request,
        )
        db.commit()
        return self.catalog(db)

    def save_skill(
        self, db: Session, admin: AuthUser, category_id: str, skill_id: str | None, payload: SaveSkillRequest,
        request: RequestInfo,
    ) -> list[AdminCategoryResponse]:
        category = db.get(CatalogCategory, category_id)
        if category is None:
            raise CatalogItemNotFoundError
        if skill_id is None:
            skill = self._new_skill(db, category, payload.name)
        else:
            skill = db.get(CatalogSkill, skill_id)
            if skill is None or skill.category_id != category.id:
                raise CatalogItemNotFoundError
        skill.name, skill.sort_order, skill.is_active = payload.name, payload.sort_order, payload.is_active
        audit.record(
            db, action=AuditAction.CATALOG_CHANGED, admin=admin, target_type="skill", target_id=skill.id,
            summary=f"{'Added' if skill_id is None else 'Changed'} service {payload.name} in {category.name}"
            + ("" if payload.is_active else " (switched off)"), request=request,
        )
        db.commit()
        return self.catalog(db)

    # ----- Services customers asked for -----

    def service_requests(self, db: Session) -> list[ServiceRequestRowResponse]:
        pending = CustomerServiceRequest.status == ServiceRequestStatus.PENDING
        rows = db.execute(
            select(CustomerServiceRequest.name_key, func.count(), func.min(CustomerServiceRequest.created_at))
            .where(pending)
            .group_by(CustomerServiceRequest.name_key)
            .order_by(func.min(CustomerServiceRequest.created_at))
        ).all()
        # The earliest spelling wins (later rows overwrite, so read newest first)
        names = dict(db.execute(
            select(CustomerServiceRequest.name_key, CustomerServiceRequest.name)
            .where(pending)
            .order_by(CustomerServiceRequest.created_at.desc())
        ).all())
        return [
            ServiceRequestRowResponse(key=key, name=names[key], customers=count, first_requested_at=first)
            for key, count, first in rows
        ]

    def approve_service_request(
        self, db: Session, admin: AuthUser, key: str, payload: ApproveServiceRequest, request: RequestInfo
    ) -> list[ServiceRequestRowResponse]:
        """Every customer who asked for it gets the service as a favourite."""
        pending = self._pending(db, key)
        if payload.skill_id is not None:
            skill = db.get(CatalogSkill, payload.skill_id)
            if skill is None:
                raise CatalogItemNotFoundError
            summary = f"Matched the requested service {pending[0].name} to {skill.name}"
        else:
            category = db.get(CatalogCategory, payload.category_id)
            if category is None:
                raise CatalogItemNotFoundError
            skill = self._new_skill(db, category, payload.name or pending[0].name)
            skill.sort_order, skill.is_active = len(category.skills) + 1, True
            db.flush()
            summary = f"Added service {skill.name} in {category.name}, asked for by {len(pending)} customer(s)"
        users = [r.user_id for r in pending]
        has_it = set(db.scalars(
            select(CustomerFavoriteSkill.user_id)
            .where(CustomerFavoriteSkill.skill_id == skill.id, CustomerFavoriteSkill.user_id.in_(users))
        ))
        db.add_all(CustomerFavoriteSkill(user_id=user_id, skill_id=skill.id) for user_id in users if user_id not in has_it)
        self._close_requests(db, admin, key, ServiceRequestStatus.APPROVED, skill.id)
        audit.record(
            db, action=AuditAction.CATALOG_CHANGED, admin=admin, target_type="skill", target_id=skill.id,
            summary=summary, request=request,
        )
        db.commit()
        return self.service_requests(db)

    def reject_service_request(
        self, db: Session, admin: AuthUser, key: str, request: RequestInfo
    ) -> list[ServiceRequestRowResponse]:
        """Dropped from those customers' favourites; their popup asks again for the missing one."""
        pending = self._pending(db, key)
        self._close_requests(db, admin, key, ServiceRequestStatus.REJECTED, None)
        audit.record(
            db, action=AuditAction.CATALOG_CHANGED, admin=admin, target_type="service_request", target_id=key,
            summary=f"Turned down the requested service {pending[0].name} ({len(pending)} customer(s))",
            request=request,
        )
        db.commit()
        return self.service_requests(db)

    # ----- Helpers -----

    def _new_skill(self, db: Session, category: CatalogCategory, name: str) -> CatalogSkill:
        new_id = f"{category.id}-{slug(name)}"[:60]
        if not slug(name) or db.get(CatalogSkill, new_id) is not None:
            raise CatalogIdTakenError
        skill = CatalogSkill(id=new_id, category_id=category.id, name=name)
        db.add(skill)
        return skill

    def _pending(self, db: Session, key: str) -> list[CustomerServiceRequest]:
        pending = list(db.scalars(
            select(CustomerServiceRequest)
            .where(CustomerServiceRequest.name_key == key, CustomerServiceRequest.status == ServiceRequestStatus.PENDING)
            .order_by(CustomerServiceRequest.created_at)
        ))
        if not pending:
            raise CatalogItemNotFoundError
        return pending

    def _close_requests(
        self, db: Session, admin: AuthUser, key: str, status: ServiceRequestStatus, skill_id: str | None
    ) -> None:
        db.execute(
            update(CustomerServiceRequest)
            .where(CustomerServiceRequest.name_key == key, CustomerServiceRequest.status == ServiceRequestStatus.PENDING)
            .values(status=status, skill_id=skill_id, resolved_at=utc_now(), resolved_by=admin.id)
            .execution_options(synchronize_session=False)
        )

    def _review_rows(self, db: Session, reviews: list[JobReview]) -> list[AdminReviewRowResponse]:
        titles = dict(db.execute(select(Job.id, Job.title).where(Job.id.in_({r.job_id for r in reviews}))).all())
        subjects = {u.id: u for u in db.scalars(select(AuthUser).where(AuthUser.id.in_({r.subject_id for r in reviews})))}
        return [
            AdminReviewRowResponse(
                id=r.id, job_id=r.job_id, job_title=titles.get(r.job_id, ""), author=person(r.author), author_role=r.author_role,
                subject=person(subjects.get(r.subject_id)), stars=r.stars, comment=r.comment, hidden=r.hidden_at is not None,
                hidden_reason=r.hidden_reason, created_at=r.created_at,
            )
            for r in reviews
        ]
