import type { RouteObject } from 'react-router-dom';
import SuspenseWrapper from '@/components/wrapper/SuspenseWrapper';
import { RouterKeys } from '@/config/router/RouterKeys';
import { CategoryRedirectPage, ProviderProfilePage, ProviderSearchPage } from '@/pages/pros';

/** Customers: search pros and open a category; mounted under RequireAuth for customers. */
export const prosSearchRoutes: RouteObject[] = [
  { path: RouterKeys.SEARCH, element: <SuspenseWrapper><ProviderSearchPage /></SuspenseWrapper> },
  { path: RouterKeys.CATEGORY, element: <SuspenseWrapper><CategoryRedirectPage /></SuspenseWrapper> },
];

/** A pro's public profile, for any signed-in user */
export const prosProfileRoutes: RouteObject[] = [
  { path: RouterKeys.PRO_PROFILE, element: <SuspenseWrapper><ProviderProfilePage /></SuspenseWrapper> },
];
