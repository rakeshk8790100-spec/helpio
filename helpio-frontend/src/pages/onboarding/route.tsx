import type { RouteObject } from 'react-router-dom';
import SuspenseWrapper from '@/components/wrapper/SuspenseWrapper';
import { RouterKeys } from '@/config/router/RouterKeys';
import { ServiceAreaPage, SkillsPage } from '@/pages/onboarding';

/** Provider sign-up steps 2 and 3; mounted under RequireAuth for providers. */
export const onboardingRoutes: RouteObject[] = [
  { path: RouterKeys.ONBOARDING_SKILLS, element: <SuspenseWrapper><SkillsPage /></SuspenseWrapper> },
  { path: RouterKeys.ONBOARDING_AREA, element: <SuspenseWrapper><ServiceAreaPage /></SuspenseWrapper> },
];
