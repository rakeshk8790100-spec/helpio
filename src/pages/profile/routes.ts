import type { RouteObject } from 'react-router-dom';
import { RouterKeys } from '../../config/router/RouterKeys';
import ProfileServiceAreaPage from './screens/profileServiceArea.page';
import ProfileSkillsPage from './screens/profileSkills.page';

/** Provider: change skills, or service area and hours, after sign-up; mounted under RequireAuth for providers. */
export const providerProfileRoutes: RouteObject[] = [
  { path: RouterKeys.PROFILE_SKILLS, Component: ProfileSkillsPage },
  { path: RouterKeys.PROFILE_AREA, Component: ProfileServiceAreaPage },
];
