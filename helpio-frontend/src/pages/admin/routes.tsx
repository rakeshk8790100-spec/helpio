import { Navigate } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import { RouterKeys } from '../../config/router/RouterKeys';
import AdminsPage from './screens/admins/admins.page';
import ApprovalsPage from './screens/approvals/approvals.page';
import CatalogPage from './screens/catalog/catalog.page';
import JobsAdminPage from './screens/jobs/jobs.page';
import PaymentsPage from './screens/payments/payments.page';
import ReviewsAdminPage from './screens/reviews/reviews.page';
import UsersPage from './screens/users/users.page';
import AuditLogPage from './screens/audit/auditLog.page';
import DashboardPage from './screens/dashboard/dashboard.page';
import AdminLoginPage from './screens/login/adminLogin.page';
import AdminRequestAccessPage from './screens/requestAccess/adminRequestAccess.page';
import AppSettingsPage from './screens/settings/appSettings.page';
import SystemStatusPage from './screens/status/systemStatus.page';

/** Public admin pages: the console log-in and access requests. */
export const adminPublicRoutes: RouteObject[] = [
  { path: RouterKeys.ADMIN_LOGIN, Component: AdminLoginPage },
  { path: RouterKeys.ADMIN_REQUEST_ACCESS, Component: AdminRequestAccessPage },
];

/** Console screens; mounted under RequireAuth for admins, inside AdminLayout. */
export const adminRoutes: RouteObject[] = [
  { index: true, Component: DashboardPage },
  { path: RouterKeys.ADMIN_APPROVALS, Component: ApprovalsPage },
  { path: RouterKeys.ADMIN_ADMINS, Component: AdminsPage },
  { path: RouterKeys.ADMIN_USERS, Component: UsersPage },
  { path: RouterKeys.ADMIN_JOBS, Component: JobsAdminPage },
  { path: RouterKeys.ADMIN_PAYMENTS, Component: PaymentsPage },
  { path: RouterKeys.ADMIN_REVIEWS, Component: ReviewsAdminPage },
  { path: RouterKeys.ADMIN_CATALOG, Component: CatalogPage },
  { path: RouterKeys.ADMIN_STATUS, Component: SystemStatusPage },
  { path: RouterKeys.ADMIN_SETTINGS, Component: AppSettingsPage },
  { path: RouterKeys.ADMIN_AUDIT, Component: AuditLogPage },
  { path: `${RouterKeys.ADMIN}/*`, element: <Navigate to={RouterKeys.ADMIN} replace /> },
];
