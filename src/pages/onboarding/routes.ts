import type { RouteObject } from 'react-router-dom';
import { RouterKeys } from '../../config/router/RouterKeys';
import ServiceAreaPage from './screens/serviceArea/serviceArea.page';
import SkillsPage from './screens/skills/skills.page';

/** Provider sign-up steps 2 and 3; mounted under RequireAuth for providers. */
export const onboardingRoutes: RouteObject[] = [
  { path: RouterKeys.ONBOARDING_SKILLS, Component: SkillsPage },
  { path: RouterKeys.ONBOARDING_AREA, Component: ServiceAreaPage },
];
