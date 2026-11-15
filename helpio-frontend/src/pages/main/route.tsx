import type { RouteObject } from 'react-router-dom';
import { RouterKeys } from '@/config/router/RouterKeys';
import FallbackPage from './screens/fallback/fallback.page';

/** Provider screens planned but not built yet; listed so each sits behind the right role. */
export const comingSoonRoutes: RouteObject[] = [RouterKeys.PRO_VERIFICATION, RouterKeys.PRO_WORK].map((path) => ({
  path,
  element: <FallbackPage kind="soon" />,
}));

/** Any other address */
export const notFoundRoutes: RouteObject[] = [{ path: '*', element: <FallbackPage kind="missing" /> }];
