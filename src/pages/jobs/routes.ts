import type { RouteObject } from 'react-router-dom';
import { RouterKeys } from '../../config/router/RouterKeys';
import { CustomerJobChatPage, ProviderJobChatPage } from './screens/jobChat/jobChat.page';
import JobDetailPage from './screens/jobDetail/jobDetail.page';
import MyJobsPage from './screens/myJobs/myJobs.page';
import NearbyJobsPage from './screens/nearbyJobs/nearbyJobs.page';
import PostJobPage from './screens/postJob/postJob.page';
import ProviderJobPage from './screens/providerJob/providerJob.page';

/** Customer job screens; mounted under RequireAuth for customers. */
export const customerJobRoutes: RouteObject[] = [
  { path: RouterKeys.POST_JOB, Component: PostJobPage },
  { path: RouterKeys.JOBS, Component: MyJobsPage },
  { path: RouterKeys.JOB_DETAIL, Component: JobDetailPage },
  { path: RouterKeys.JOB_CHAT, Component: CustomerJobChatPage },
];

/** Provider job search and quoting; mounted under RequireAuth for providers. */
export const providerJobRoutes: RouteObject[] = [
  { path: RouterKeys.PRO_JOBS, Component: NearbyJobsPage },
  { path: RouterKeys.PRO_JOB_DETAIL, Component: ProviderJobPage },
  { path: RouterKeys.PRO_JOB_CHAT, Component: ProviderJobChatPage },
];
