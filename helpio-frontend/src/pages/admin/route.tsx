import {
  AdminLoginPage,
  AdminRequestAccessPage,
  AdminsPage,
  AppSettingsPage,
  ApprovalsPage,
  AuditLogPage,
  CatalogPage,
  DashboardPage,
  JobsAdminPage,
  PaymentsPage,
  ReviewsAdminPage,
  SystemStatusPage,
  UsersPage,
} from '.';
import { Navigate } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import SuspenseWrapper from '@/components/wrapper/SuspenseWrapper';
import { RouterKeys } from '@/config/router/RouterKeys';

const page = (Page: React.ComponentType) => (
  <SuspenseWrapper>
    <Page />
  </SuspenseWrapper>
);

/** Public admin pages: the console log-in and access requests. */
export const adminPublicRoutes: RouteObject[] = [
  { path: RouterKeys.ADMIN_LOGIN, element: page(AdminLoginPage) },
  { path: RouterKeys.ADMIN_REQUEST_ACCESS, element: page(AdminRequestAccessPage) },
];

/** Console screens; mounted under AuthWrapper for admins, inside the admin shell. */
export const adminRoutes: RouteObject[] = [
  { index: true, element: page(DashboardPage) },
  { path: RouterKeys.ADMIN_APPROVALS, element: page(ApprovalsPage) },
  { path: RouterKeys.ADMIN_ADMINS, element: page(AdminsPage) },
  { path: RouterKeys.ADMIN_USERS, element: page(UsersPage) },
  { path: RouterKeys.ADMIN_JOBS, element: page(JobsAdminPage) },
  { path: RouterKeys.ADMIN_PAYMENTS, element: page(PaymentsPage) },
  { path: RouterKeys.ADMIN_REVIEWS, element: page(ReviewsAdminPage) },
  { path: RouterKeys.ADMIN_CATALOG, element: page(CatalogPage) },
  { path: RouterKeys.ADMIN_STATUS, element: page(SystemStatusPage) },
  { path: RouterKeys.ADMIN_SETTINGS, element: page(AppSettingsPage) },
  { path: RouterKeys.ADMIN_AUDIT, element: page(AuditLogPage) },
  { path: `${RouterKeys.ADMIN}/*`, element: <Navigate to={RouterKeys.ADMIN} replace /> },
];
