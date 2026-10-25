import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CustomerHomeLayoutProps } from '../client/default/home/home.layout.types';
import type { AuthUser, Job } from '../common/CommonDto';
import { JobStatus } from '../common/CommonEnum';
import { MOCK_CATEGORIES } from '../common/CommonMock';
import { RouterKeys, toPath, withQuery } from '../config/router/RouterKeys';
import { apiErrorMessage } from '../lib/apiError';
import { draftJobDescription, firstName } from '../lib/utils';
import { useGetCustomerHomeQuery } from '../pages/home/home.api';
import { useGetAddressesQuery } from '../pages/profile/profile.api';
import { useSearchProvidersQuery } from '../pages/pros/pros.api';
import { callEmergency } from '../lib/safety';
import { toJobItem } from './jobItems';

const HOME_PROS = 6;

/** What the active-job card says for each hired stage: status, next step and button. */
const ACTIVE_COPY: Partial<Record<JobStatus, (job: Job) => { statusLabel: string; nextStep: string; actionLabel: string }>> = {
  [JobStatus.ACCEPTED]: () => ({
    statusLabel: 'Pro hired',
    nextStep: 'Pay into escrow so your pro can start. Money is released only for approved work.',
    actionLabel: 'Pay into escrow',
  }),
  [JobStatus.FUNDED]: () => ({
    statusLabel: 'Payment secured',
    nextStep: 'Share your start PIN when the pro arrives. Work begins only with it.',
    actionLabel: 'View start PIN',
  }),
  [JobStatus.IN_PROGRESS]: (job) => ({
    statusLabel: 'Work in progress',
    nextStep: `Next: review proof for the ${Math.min(job.progressPct + 25, 100)}% stage.`,
    actionLabel: 'Open job',
  }),
};

/** Signed-in customer home: live job, quotes to review, posted jobs and drafts, plus search and discovery. */
export const useCustomerHome = (user: AuthUser): CustomerHomeLayoutProps => {
  const navigate = useNavigate();
  const { data, error, isLoading, refetch } = useGetCustomerHomeQuery();
  const addresses = useGetAddressesQuery();
  // Searches from the default address; skipped until the customer has one
  const pros = useSearchProvidersQuery({}, { skip: !addresses.data?.length });
  const [jobText, setJobText] = useState('');

  const openJob = (job: Job) => navigate(toPath(RouterKeys.JOB_DETAIL, { id: job.id }));
  const postJob = (params: Record<string, string> = {}) => navigate(withQuery(RouterKeys.POST_JOB, params));

  const jobs = ((): CustomerHomeLayoutProps['jobs'] => {
    if (isLoading) return { status: 'loading' };
    if (!data) return { status: 'error', message: apiErrorMessage(error), onRetry: refetch };

    const active = data.activeJob;
    const copy = active && ACTIVE_COPY[active.status]?.(active);
    const item = (job: Job) => toJobItem(job, openJob, (draft) => postJob({ job: draft.id }));
    const decisions = data.awaitingDecision.map(item);
    const waiting = data.waitingForQuotes.map(item);
    const drafts = data.drafts.map(item);

    return {
      status: 'ready',
      active: active && copy ? {
        eyebrow: 'Your active job',
        title: active.title,
        progressPct: active.progressPct,
        ...copy,
        onAction: () => openJob(active),
        onSafety: callEmergency,
      } : null,
      decisions,
      waiting,
      drafts,
      onSeeAll: () => navigate(RouterKeys.JOBS),
    };
  })();

  return {
    firstName: firstName(user.name),
    onSearch: () => navigate(RouterKeys.SEARCH),
    jobs,
    onPostJob: () => postJob(),
    onEmergencyJob: () => postJob({ emergency: '1' }),
    composer: {
      value: jobText,
      onChange: setJobText,
      onImprove: () => setJobText(draftJobDescription(jobText)),
      onSubmit: () => postJob(jobText ? { description: jobText } : {}),
    },
    // Catalogue mocks until a categories/services endpoint exists
    categories: {
      items: MOCK_CATEGORIES,
      onSelect: (c) => navigate(toPath(RouterKeys.CATEGORY, { id: c.id })),
      onMore: () => navigate(RouterKeys.SEARCH),
    },
    pros: pros.data?.providers.length
      ? {
          items: pros.data.providers.slice(0, HOME_PROS).map((provider) => ({
            provider,
            onOpen: () => navigate(toPath(RouterKeys.PRO_PROFILE, { id: provider.id })),
          })),
          onSeeAll: () => navigate(RouterKeys.SEARCH),
        }
      : null,
  };
};
