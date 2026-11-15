import { createBrowserRouter } from 'react-router-dom';
import { UserRole } from '@/common/CommonEnum';
import AuthWrapper from '@/components/wrapper/AuthWrapper';
import AdminPage from '@/pages/admin/AdminPage';
import { adminPublicRoutes, adminRoutes } from '@/pages/admin/route';
import { authRoutes } from '@/pages/auth/route';
import { earningsRoutes } from '@/pages/earnings/route';
import { homeRoutes } from '@/pages/home/route';
import { customerJobRoutes, providerJobRoutes } from '@/pages/jobs/route';
import MainPage from '@/pages/main/MainPage';
import { comingSoonRoutes, notFoundRoutes } from '@/pages/main/route';
import { onboardingRoutes } from '@/pages/onboarding/route';
import { profileRoutes, providerProfileRoutes } from '@/pages/profile/route';
import { prosProfileRoutes, prosSearchRoutes } from '@/pages/pros/route';
import { RouterKeys } from './RouterKeys';

/** The app's routes: each module lists its own (pages/<module>/route.tsx); this file places them by role. */
const myRouter = createBrowserRouter([
  // Admin console (desktop, its own shell): log-in and access requests, then admin screens
  {
    path: RouterKeys.ADMIN,
    children: [
      ...adminPublicRoutes,
      {
        element: <AuthWrapper roles={[UserRole.ADMIN]} />,
        children: [{ element: <AdminPage />, children: adminRoutes }],
      },
    ],
  },
  {
    path: '/',
    element: <MainPage />,
    children: [
      // Landing page when signed out, customer or provider home when signed in
      ...homeRoutes,
      // Public: customer and provider log-in, sign-up and password reset
      ...authRoutes,
      // Provider sign-up steps 2 and 3
      { element: <AuthWrapper roles={[UserRole.PROVIDER]} />, children: onboardingRoutes },
      // Customers: post and follow jobs, find pros
      { element: <AuthWrapper roles={[UserRole.CUSTOMER]} />, children: [...customerJobRoutes, ...prosSearchRoutes] },
      // Providers: nearby jobs, hired jobs, their profile and earnings
      {
        element: <AuthWrapper roles={[UserRole.PROVIDER]} />,
        children: [...providerJobRoutes, ...providerProfileRoutes, ...earningsRoutes, ...comingSoonRoutes],
      },
      // Both roles: own profile and pros' public profiles
      { element: <AuthWrapper />, children: [...profileRoutes, ...prosProfileRoutes] },
      ...notFoundRoutes,
    ],
  },
]);

export default myRouter;
