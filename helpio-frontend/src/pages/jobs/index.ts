import { lazy } from 'react';

export const PostJobPage = lazy(() => import('@/pages/jobs/screens/postJob/postJob.page'));
export const MyJobsPage = lazy(() => import('@/pages/jobs/screens/myJobs/myJobs.page'));
export const JobDetailPage = lazy(() => import('@/pages/jobs/screens/jobDetail/jobDetail.page'));
export const CustomerJobChatPage = lazy(() =>
  import('@/pages/jobs/screens/jobChat/jobChat.page').then((m) => ({ default: m.CustomerJobChatPage })),
);
export const ProviderJobChatPage = lazy(() =>
  import('@/pages/jobs/screens/jobChat/jobChat.page').then((m) => ({ default: m.ProviderJobChatPage })),
);
export const NearbyJobsPage = lazy(() => import('@/pages/jobs/screens/nearbyJobs/nearbyJobs.page'));
export const ProviderJobPage = lazy(() => import('@/pages/jobs/screens/providerJob/providerJob.page'));
