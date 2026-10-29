"""
Getting into the admin console: email and password, then a code emailed to the admin. New admins ask for access and
wait for the owner (ADMIN_OWNER_EMAIL), who approves, rejects, deactivates or reactivates them. Everything is audited.
"""
import logging
from datetime import timedelta
from math import ceil

from fastapi import BackgroundTasks
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.runtime_settings import runtime_settings
from app.core.database import utc_now
from app.modules.admin import audit
from app.modules.admin.audit import AdminAuditLog, AuditAction, RequestInfo
from app.modules.admin.exceptions import (
    AdminLoginLockedError,
    AdminNotFoundError,
    AdminNotPendingError,
    OwnerProtectedError,
)
from app.modules.admin.schema import (
    AdminAccessResultResponse,
    AdminLoginRequest,
    AdminResponse,
    AuditEntryResponse,
)
from app.modules.auth.exceptions import InvalidCredentialsError, InvalidOtpError, TooManyOtpAttemptsError
from app.modules.auth.model import ApprovalStatus, AuthUser, UserRole
from app.modules.auth.schema import (
    AdminAccessRequest,
    LoginRequest,
    SessionResponse,
    SignupCodeResponse,
    VerifySignupRequest,
)
from app.modules.auth.service import AuthService, is_owner_email
from app.modules.notifications.service import NotificationService, send_email
from app.utils.pagination import Page, PageParams, paginate

logger = logging.getLogger(__name__)

# 5 failed log-ins within 15 minutes lock that email for 15 minutes
LOCKOUT_FAILURES = 5
LOCKOUT_WINDOW = timedelta(minutes=15)


def label(user: AuthUser) -> str:
    return f"{user.name} ({user.email})" if user.name else user.email


def console_link(path: str) -> str | None:
    base = runtime_settings().app_web_url.rstrip("/")
    return f"{base}{path}" if base else None


class AdminAccessService:
    def __init__(self, *, auth: AuthService | None = None, notifications: NotificationService | None = None) -> None:
        self._auth = auth
        self.notifications = notifications or NotificationService()

    @property
    def auth(self) -> AuthService:
        if self._auth is None:
            self._auth = AuthService()
        return self._auth

    # ----- Log-in -----

    def start_login(self, db: Session, payload: AdminLoginRequest, request: RequestInfo) -> SignupCodeResponse:
        self._check_lockout(db, payload.email)
        try:
            return self.auth.send_admin_login_code(db, LoginRequest(email=payload.email, password=payload.password))
        except InvalidCredentialsError:
            self._failed(db, payload.email, request, "password")
            raise

    def verify_login(self, db: Session, payload: VerifySignupRequest, request: RequestInfo) -> SessionResponse:
        self._check_lockout(db, payload.email)
        try:
            user, session = self.auth.verify_admin_login(db, email=payload.email, otp=payload.otp)
        except (InvalidOtpError, TooManyOtpAttemptsError):
            self._failed(db, payload.email, request, "code")
            raise
        audit.record(db, action=AuditAction.LOGIN, admin=user, summary=f"{label(user)} logged in", request=request)
        db.commit()
        return session

    # ----- Asking for access -----

    def request_access(self, db: Session, payload: AdminAccessRequest) -> SignupCodeResponse:
        return self.auth.request_admin_access(db, payload)

    def verify_request(
        self, db: Session, payload: VerifySignupRequest, request: RequestInfo, background: BackgroundTasks | None = None
    ) -> AdminAccessResultResponse:
        user = self.auth.verify_admin_access(db, payload)
        audit.record(
            db, action=AuditAction.ACCESS_REQUESTED, actor_email=user.email, target_type="admin", target_id=user.id,
            summary=f"{label(user)} asked for admin access", request=request,
        )
        db.commit()
        owner = get_settings().admin_owner_email.strip()
        if user.approval_status == ApprovalStatus.PENDING:
            if owner:
                self._email(
                    background, owner, "New admin access request",
                    f"{label(user)} asked for access to the Helpio admin console. Approve or reject it in the console.",
                    console_link("/admin/admins"),
                )
            else:
                logger.warning("Admin access request from %s: set ADMIN_OWNER_EMAIL so someone can approve it", user.email)
        return AdminAccessResultResponse(email=user.email, approval_status=user.approval_status)

    # ----- The owner's decisions -----

    def admins(self, db: Session) -> list[AdminResponse]:
        """Pending requests first, then everyone else by name."""
        users = db.scalars(select(AuthUser).where(AuthUser.role == UserRole.ADMIN)).all()
        order = {ApprovalStatus.PENDING: 0, ApprovalStatus.APPROVED: 1, ApprovalStatus.REJECTED: 2}
        return [self._admin(u) for u in sorted(users, key=lambda u: (order[u.approval_status], (u.name or u.email).lower()))]

    def approve(
        self, db: Session, owner: AuthUser, admin_id: str, request: RequestInfo, background: BackgroundTasks | None = None
    ) -> AdminResponse:
        user = self._target(db, admin_id)
        if user.approval_status == ApprovalStatus.APPROVED:
            raise AdminNotPendingError
        user.approval_status, user.approval_note = ApprovalStatus.APPROVED, None
        user.approved_at, user.approved_by = utc_now(), owner.id
        audit.record(
            db, action=AuditAction.ADMIN_APPROVED, admin=owner, target_type="admin", target_id=user.id,
            summary=f"Approved admin access for {label(user)}", request=request,
        )
        db.commit()
        self._email(
            background, user.email, "Your Helpio admin access is approved",
            "You can now log in to the admin console with your email and password. We'll email you a code each time.",
            console_link("/admin/login"),
        )
        return self._admin(user)

    def reject(
        self, db: Session, owner: AuthUser, admin_id: str, reason: str, request: RequestInfo,
        background: BackgroundTasks | None = None,
    ) -> AdminResponse:
        user = self._target(db, admin_id)
        if user.approval_status != ApprovalStatus.PENDING:
            raise AdminNotPendingError
        user.approval_status, user.approval_note = ApprovalStatus.REJECTED, reason
        user.token_version += 1
        audit.record(
            db, action=AuditAction.ADMIN_REJECTED, admin=owner, target_type="admin", target_id=user.id,
            summary=f"Rejected admin access for {label(user)}", request=request, reason=reason,
        )
        db.commit()
        self._email(
            background, user.email, "Your Helpio admin access request",
            f"Your request for access to the Helpio admin console wasn't approved. {reason}", None,
        )
        return self._admin(user)

    def set_active(
        self, db: Session, owner: AuthUser, admin_id: str, active: bool, reason: str | None, request: RequestInfo
    ) -> AdminResponse:
        user = self._target(db, admin_id)
        if user.is_active != active:
            user.is_active = active
            if not active:
                # Signed out everywhere at once
                user.token_version += 1
            audit.record(
                db, action=AuditAction.ADMIN_ACTIVATED if active else AuditAction.ADMIN_DEACTIVATED, admin=owner,
                target_type="admin", target_id=user.id,
                summary=f"{'Reactivated' if active else 'Deactivated'} admin {label(user)}", request=request,
                **({"reason": reason} if reason else {}),
            )
            db.commit()
        return self._admin(user)

    # ----- Audit log -----

    def audit_log(
        self, db: Session, params: PageParams, *, action: str | None = None, admin_id: str | None = None,
        target_type: str | None = None, target_id: str | None = None,
    ) -> Page[AuditEntryResponse]:
        query = select(AdminAuditLog).order_by(AdminAuditLog.created_at.desc())
        if action:
            query = query.where(AdminAuditLog.action == action)
        if admin_id:
            query = query.where(AdminAuditLog.admin_id == admin_id)
        if target_type:
            query = query.where(AdminAuditLog.target_type == target_type)
        if target_id:
            query = query.where(AdminAuditLog.target_id == target_id)
        rows, total = paginate(db, query, params)
        return Page[AuditEntryResponse](
            items=[
                AuditEntryResponse(
                    id=row.id, action=row.action, summary=row.summary,
                    actor=(row.admin.name or row.admin.email) if row.admin else row.actor_email,
                    target_type=row.target_type, target_id=row.target_id, details=row.details or {}, ip=row.ip,
                    created_at=row.created_at,
                )
                for row in rows
            ],
            total=total, page=params.page, page_size=params.page_size,
        )

    # ----- Helpers -----

    def _check_lockout(self, db: Session, email: str) -> None:
        now = utc_now()
        failures = audit.recent_failures(db, email.lower(), now - LOCKOUT_WINDOW, LOCKOUT_FAILURES)
        if len(failures) >= LOCKOUT_FAILURES:
            # Open again once the oldest of those failures is out of the window
            seconds = (failures[-1] + LOCKOUT_WINDOW - now).total_seconds()
            raise AdminLoginLockedError(max(1, ceil(seconds / 60)))

    def _failed(self, db: Session, email: str, request: RequestInfo, step: str) -> None:
        audit.record(
            db, action=AuditAction.LOGIN_FAILED, actor_email=email.lower(),
            summary=f"Failed admin log-in for {email.lower()} (wrong {step})", request=request, step=step,
        )
        db.commit()

    def _target(self, db: Session, admin_id: str) -> AuthUser:
        user = db.get(AuthUser, admin_id)
        if user is None or user.role != UserRole.ADMIN:
            raise AdminNotFoundError
        if is_owner_email(user.email):
            raise OwnerProtectedError
        return user

    def _admin(self, user: AuthUser) -> AdminResponse:
        return AdminResponse(
            id=user.id, name=user.name, email=user.email, phone=user.phone, approval_status=user.approval_status,
            approval_note=user.approval_note, is_active=user.is_active, is_owner=is_owner_email(user.email),
            created_at=user.created_at, approved_at=user.approved_at,
        )

    def _email(self, background: BackgroundTasks | None, to: str, subject: str, body: str, link: str | None) -> None:
        """Best effort, after the response when there's a request to attach it to."""
        if background is not None:
            background.add_task(send_email, self.notifications.email_client, to, subject, body, link)
        else:
            send_email(self.notifications.email_client, to, subject, body, link)
