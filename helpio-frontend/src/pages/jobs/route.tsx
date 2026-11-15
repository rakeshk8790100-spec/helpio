import type { RouteObject } from 'react-router-dom';
import SuspenseWrapper from '@/components/wrapper/SuspenseWrapper';
import { RouterKeys } from '@/config/router/RouterKeys';
import {
  CustomerJobChatPage,
  JobDetailPage,
  MyJobsPage,
  NearbyJobsPage,
  PostJobPage,
  ProviderJobChatPage,
  ProviderJobPage,
} from '@/pages/jobs';

/** Customer job screens; mounted under AuthWrapper for customers. */
export const customerJobRoutes: RouteObject[] = [
  { path: RouterKeys.POST_JOB, element: <SuspenseWrapper><PostJobPage /></SuspenseWrapper> },
  { path: RouterKeys.JOBS, element: <SuspenseWrapper><MyJobsPage /></SuspenseWrapper> },
  { path: RouterKeys.JOB_DETAIL, element: <SuspenseWrapper><JobDetailPage /></SuspenseWrapper> },
  { path: RouterKeys.JOB_CHAT, element: <SuspenseWrapper><CustomerJobChatPage /></SuspenseWrapper> },
];

/** Provider job search and quoting; mounted under AuthWrapper for providers. */
export const providerJobRoutes: RouteObject[] = [
  { path: RouterKeys.PRO_JOBS, element: <SuspenseWrapper><NearbyJobsPage /></SuspenseWrapper> },
  { path: RouterKeys.PRO_JOB_DETAIL, element: <SuspenseWrapper><ProviderJobPage /></SuspenseWrapper> },
  { path: RouterKeys.PRO_JOB_CHAT, element: <SuspenseWrapper><ProviderJobChatPage /></SuspenseWrapper> },
];
