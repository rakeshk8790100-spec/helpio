import { lazy } from 'react';

/*
 * Every screen layout, loaded on demand from the active client (@client → src/clients/<VITE_ORG_NAME>).
 * Pages import layouts from here and render them inside <SuspenseWrapper>.
 */
export const EarningsLayout = lazy(() => import('@client/earnings/screens/earnings/earningsLayout'));
export const HeroLayout = lazy(() => import('@client/hero/screens/hero/heroLayout'));
export const CustomerHomeLayout = lazy(() => import('@client/home/screens/customerHome/customerHomeLayout'));
export const ProviderHomeLayout = lazy(() => import('@client/home/screens/providerHome/providerHomeLayout'));
export const FavoritesLayout = lazy(() => import('@client/customer/screens/favorites/favoritesLayout'));
export const SkillsLayout = lazy(() => import('@client/onboarding/screens/skills/skillsLayout'));
export const ServiceAreaLayout = lazy(() => import('@client/onboarding/screens/serviceArea/serviceAreaLayout'));
export const ProfileLayout = lazy(() => import('@client/profile/screens/profile/profileLayout'));
export const AddressForm = lazy(() => import('@client/profile/screens/profile/addressForm'));
export const ProviderSearchLayout = lazy(() => import('@client/pros/screens/providerSearch/providerSearchLayout'));
export const ProviderProfileLayout = lazy(() => import('@client/pros/screens/providerProfile/providerProfileLayout'));
export const CompleteProfileLayout = lazy(() => import('@client/auth/screens/login/completeProfileLayout'));
export const LoginLayout = lazy(() => import('@client/auth/screens/login/loginLayout'));
export const SignupLayout = lazy(() => import('@client/auth/screens/signup/signupLayout'));
export const RegisterLayout = lazy(() => import('@client/auth/screens/register/registerLayout'));
export const ForgotPasswordLayout = lazy(() => import('@client/auth/screens/forgotPassword/forgotPasswordLayout'));
export const LoginModalLayout = lazy(() => import('@client/auth/screens/loginModal/loginModalLayout'));
export const MyJobsLayout = lazy(() => import('@client/jobs/screens/myJobs/myJobsLayout'));
export const JobDetailLayout = lazy(() => import('@client/jobs/screens/jobDetail/jobDetailLayout'));
export const PostJobForm = lazy(() => import('@client/jobs/screens/postJob/postJobForm'));
export const JobChatLayout = lazy(() => import('@client/jobs/screens/jobChat/jobChatLayout'));
export const NearbyJobsLayout = lazy(() => import('@client/jobs/screens/nearbyJobs/nearbyJobsLayout'));
export const ProviderJobLayout = lazy(() => import('@client/jobs/screens/providerJob/providerJobLayout'));
export const AdminLoginLayout = lazy(() => import('@client/admin/screens/adminLogin/adminLoginLayout'));
export const AdminRequestAccessLayout = lazy(() => import('@client/admin/screens/adminRequestAccess/adminRequestAccessLayout'));
export const DashboardLayout = lazy(() => import('@client/admin/screens/dashboard/dashboardLayout'));
export const ApprovalsLayout = lazy(() => import('@client/admin/screens/approvals/approvalsLayout'));
export const AdminsLayout = lazy(() => import('@client/admin/screens/admins/adminsLayout'));
export const UsersLayout = lazy(() => import('@client/admin/screens/users/usersLayout'));
export const JobsAdminLayout = lazy(() => import('@client/admin/screens/jobs/jobsLayout'));
export const PaymentsLayout = lazy(() => import('@client/admin/screens/payments/paymentsLayout'));
export const ReviewsAdminLayout = lazy(() => import('@client/admin/screens/reviews/reviewsLayout'));
export const CatalogLayout = lazy(() => import('@client/admin/screens/catalog/catalogLayout'));
export const SystemStatusLayout = lazy(() => import('@client/admin/screens/systemStatus/systemStatusLayout'));
export const AppSettingsLayout = lazy(() => import('@client/admin/screens/appSettings/appSettingsLayout'));
export const AuditLogLayout = lazy(() => import('@client/admin/screens/auditLog/auditLogLayout'));
