import type { RouteObject } from 'react-router-dom';
import SuspenseWrapper from '@/components/wrapper/SuspenseWrapper';
import { HomePage } from '@/pages/home';

/** `/`: landing page or the signed-in home */
export const homeRoutes: RouteObject[] = [
  {
    index: true,
    element: (
      <SuspenseWrapper>
        <HomePage />
      </SuspenseWrapper>
    ),
  },
];
