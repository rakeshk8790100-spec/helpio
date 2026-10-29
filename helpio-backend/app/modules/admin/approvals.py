"""New customers and providers waiting for an admin (when REQUIRE_*_APPROVAL is on): review, approve or reject them."""
from fastapi import BackgroundTasks
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import utc_now
from app.modules.admin import audit
from app.modules.admin.access import label
from app.modules.admin.audit import AuditAction, RequestInfo
from app.modules.admin.exceptions import AdminNotPendingError, UserNotFoundError
from app.modules.admin.schema import ApprovalCountsResponse, ApprovalItemResponse, ProviderSummary
from app.modules.auth.model import ApprovalStatus, AuthUser, UserRole
from app.modules.notifications.service import NotificationService, send_email
from app.modules.providers.model import ProviderProfile
from app.modules.providers.repository import ProviderRepository

# Who an admin approves here; admins are answered by the owner on the Admins page
MEMBER_ROLES = (UserRole.CUSTOMER, UserRole.PROVIDER)


class ApprovalService:
    def __init__(self, *, notifications: NotificationService | None = None) -> None:
        self.notifications = notifications or NotificationService()

    def pending(self, db: Session, role: UserRole | None = None) -> list[ApprovalItemResponse]:
        """Oldest first, so nobody waits longest by accident."""
        roles = (role,) if role in MEMBER_ROLES else MEMBER_ROLES
        users = db.scalars(
            select(AuthUser)
            .where(AuthUser.role.in_(roles), AuthUser.approval_status == ApprovalStatus.PENDING)
            .order_by(AuthUser.created_at)
        ).all()
        profiles = {p.user_id: p for p in ProviderRepository(db).get_profiles([u.id for u in users if u.role == UserRole.PROVIDER])}
        return [self._item(user, profiles.get(user.id)) for user in users]

    def counts(self, db: Session, *, owner: bool) -> ApprovalCountsResponse:
        rows = dict(db.execute(
            select(AuthUser.role, func.count()).where(AuthUser.approval_status == ApprovalStatus.PENDING).group_by(AuthUser.role)
        ).all())
        return ApprovalCountsResponse(
            customers=rows.get(UserRole.CUSTOMER, 0), providers=rows.get(UserRole.PROVIDER, 0),
            admins=rows.get(UserRole.ADMIN, 0) if owner else 0,
        )

    def approve(
        self, db: Session, admin: AuthUser, user_id: str, note: str | None, request: RequestInfo,
        background: BackgroundTasks | None = None,
    ) -> ApprovalItemResponse:
        user = self._member(db, user_id)
        if user.approval_status == ApprovalStatus.APPROVED:
            raise AdminNotPendingError
        user.approval_status, user.approval_note = ApprovalStatus.APPROVED, None
        user.approved_at, user.approved_by = utc_now(), admin.id
        audit.record(
            db, action=AuditAction.USER_APPROVED, admin=admin, target_type="user", target_id=user.id,
            summary=f"Approved {user.role.value} {label(user)}", request=request, **({"note": note} if note else {}),
        )
        provider = user.role == UserRole.PROVIDER
        # In the app and by email: a customer can now log in, a provider can now quote
        self.notifications.notify(
            db, user, type="account_approved",
            title="You're verified on Helpio" if provider else "Your Helpio account is approved",
            body="Helpio verified your profile. You can now quote on jobs near you." if provider
            else "You can now log in with your email and password and post your first job.",
            link="/pro/jobs" if provider else "/", background=background,
        )
        db.commit()
        return self._item(user, ProviderRepository(db).get_profile(user.id) if provider else None)

    def reject(
        self, db: Session, admin: AuthUser, user_id: str, reason: str, request: RequestInfo,
        background: BackgroundTasks | None = None,
    ) -> ApprovalItemResponse:
        user = self._member(db, user_id)
        if user.approval_status != ApprovalStatus.PENDING:
            raise AdminNotPendingError
        user.approval_status, user.approval_note = ApprovalStatus.REJECTED, reason
        # A provider waiting for verification may be signed in: end those sessions
        user.token_version += 1
        audit.record(
            db, action=AuditAction.USER_REJECTED, admin=admin, target_type="user", target_id=user.id,
            summary=f"Rejected {user.role.value} {label(user)}", request=request, reason=reason,
        )
        db.commit()
        subject = "About your Helpio sign-up"
        body = f"Your Helpio account wasn't approved. {reason}"
        if background is not None:
            background.add_task(send_email, self.notifications.email_client, user.email, subject, body, None)
        else:
            send_email(self.notifications.email_client, user.email, subject, body, None)
        profile = ProviderRepository(db).get_profile(user.id) if user.role == UserRole.PROVIDER else None
        return self._item(user, profile)

    # ----- Helpers -----

    def _member(self, db: Session, user_id: str) -> AuthUser:
        user = db.get(AuthUser, user_id)
        if user is None or user.role not in MEMBER_ROLES:
            raise UserNotFoundError
        return user

    def _item(self, user: AuthUser, profile: ProviderProfile | None) -> ApprovalItemResponse:
        return ApprovalItemResponse(
            id=user.id, role=user.role, name=user.name, email=user.email, phone=user.phone,
            approval_status=user.approval_status, approval_note=user.approval_note, created_at=user.created_at,
            provider=provider_summary(profile) if profile else None,
        )


def provider_summary(profile: ProviderProfile) -> ProviderSummary:
    """What a provider offers, as admins see it."""
    return ProviderSummary(
        onboarding_status=profile.onboarding_status,
        skills=[item.skill.name for item in profile.skills],
        area_name=profile.area_name, pincode=profile.pincode,
        radius_km=profile.radius_m / 1000 if profile.radius_m else None,
        work_days=sorted(slot.day_of_week for slot in profile.availability), bio=profile.bio,
    )
