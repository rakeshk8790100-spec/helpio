import { lazy } from 'react';

export const AdminLoginPage = lazy(() => import('./screens/adminLogin/adminLogin.page'));
export const AdminRequestAccessPage = lazy(() => import('./screens/adminRequestAccess/adminRequestAccess.page'));
export const DashboardPage = lazy(() => import('./screens/dashboard/dashboard.page'));
export const ApprovalsPage = lazy(() => import('./screens/approvals/approvals.page'));
export const AdminsPage = lazy(() => import('./screens/admins/admins.page'));
export const UsersPage = lazy(() => import('./screens/users/users.page'));
export const JobsAdminPage = lazy(() => import('./screens/jobs/jobs.page'));
export const PaymentsPage = lazy(() => import('./screens/payments/payments.page'));
export const ReviewsAdminPage = lazy(() => import('./screens/reviews/reviews.page'));
export const CatalogPage = lazy(() => import('./screens/catalog/catalog.page'));
export const SystemStatusPage = lazy(() => import('./screens/systemStatus/systemStatus.page'));
export const AppSettingsPage = lazy(() => import('./screens/appSettings/appSettings.page'));
export const AuditLogPage = lazy(() => import('./screens/auditLog/auditLog.page'));
