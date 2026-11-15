import type { RouteObject } from 'react-router-dom';
import SuspenseWrapper from '@/components/wrapper/SuspenseWrapper';
import { RouterKeys } from '@/config/router/RouterKeys';
import { EarningsPage } from '@/pages/earnings';

/** Provider earnings; mounted under RequireAuth for providers. */
export const earningsRoutes: RouteObject[] = [
  {
    path: RouterKeys.PRO_EARNINGS,
    element: (
      <SuspenseWrapper>
        <EarningsPage />
      </SuspenseWrapper>
    ),
  },
];
