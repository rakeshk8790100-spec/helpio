import { useNavigate, useSearchParams } from 'react-router-dom';
import { JobsTab } from '../client/default/jobs/jobs.layout.types';
import type { MyJobsLayoutProps } from '../client/default/jobs/jobs.layout.types';
import type { Job } from '../common/CommonDto';
import { JobStatus } from '../common/CommonEnum';
import { RouterKeys, toPath, withQuery } from '../config/router/RouterKeys';
import { apiErrorMessage } from '../lib/apiError';
import { useGetMyJobsQuery } from '../pages/jobs/jobs.api';
import { toJobItem } from './jobItems';

const TABS: { value: JobsTab; label: string; statuses: JobStatus[]; empty: string }[] = [
  { value: JobsTab.OPEN, label: 'Open', statuses: [JobStatus.OPEN], empty: 'No open jobs. Post one to get quotes from pros nearby.' },
  {
    value: JobsTab.ACTIVE,
    label: 'Active',
    statuses: [JobStatus.ACCEPTED, JobStatus.FUNDED, JobStatus.IN_PROGRESS, JobStatus.PAYMENT_DUE],
    empty: 'Nothing in progress. Jobs move here once you hire a pro.',
  },
  { value: JobsTab.DRAFTS, label: 'Drafts', statuses: [JobStatus.DRAFT], empty: 'No drafts. Save a job any time to finish it later.' },
  {
    value: JobsTab.PAST,
    label: 'Past',
    statuses: [JobStatus.COMPLETED, JobStatus.CANCELLED, JobStatus.DISPUTED],
    empty: 'Finished and cancelled jobs will show here.',
  },
];

/** /jobs: the customer's jobs by stage. The tab lives in `?tab=` so Back returns to it. */
export const useMyJobs = (): MyJobsLayoutProps => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { data, error, isLoading, refetch } = useGetMyJobsQuery();
  const tab = TABS.find((t) => t.value === params.get('tab')) ?? TABS[0];

  const open = (job: Job) => navigate(toPath(RouterKeys.JOB_DETAIL, { id: job.id }));
  const continueDraft = (job: Job) => navigate(withQuery(RouterKeys.POST_JOB, { job: job.id }));

  return {
    tab: tab.value,
    tabs: TABS.map(({ value, label }) => {
      const count = data?.filter((job) => TABS.find((t) => t.value === value)?.statuses.includes(job.status)).length;
      return { value, label: count ? `${label} (${count})` : label };
    }),
    onTabChange: (value) => setParams({ tab: value }, { replace: true }),
    jobs: isLoading
      ? { status: 'loading' }
      : !data
        ? { status: 'error', message: apiErrorMessage(error), onRetry: refetch }
        : {
            status: 'ready',
            items: data.filter((job) => tab.statuses.includes(job.status)).map((job) => toJobItem(job, open, continueDraft)),
            emptyText: tab.empty,
          },
    onPostJob: () => navigate(RouterKeys.POST_JOB),
  };
};
