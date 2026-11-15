import type { RouteObject } from 'react-router-dom';
import SuspenseWrapper from '@/components/wrapper/SuspenseWrapper';
import { RouterKeys } from '@/config/router/RouterKeys';
import { ProfilePage, ProfileServiceAreaPage, ProfileSkillsPage } from '@/pages/profile';

/** Own profile, for customers and providers; mounted under RequireAuth. */
export const profileRoutes: RouteObject[] = [
  { path: RouterKeys.PROFILE, element: <SuspenseWrapper><ProfilePage /></SuspenseWrapper> },
];

/** Provider: change skills, or service area and hours, after sign-up; mounted under RequireAuth for providers. */
export const providerProfileRoutes: RouteObject[] = [
  { path: RouterKeys.PROFILE_SKILLS, element: <SuspenseWrapper><ProfileSkillsPage /></SuspenseWrapper> },
  { path: RouterKeys.PROFILE_AREA, element: <SuspenseWrapper><ProfileServiceAreaPage /></SuspenseWrapper> },
];
