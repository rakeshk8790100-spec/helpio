import { useNavigate } from 'react-router-dom';
import type { ProviderHomeLayoutProps } from '../client/default/home/home.layout.types';
import type { AuthUser, NearbyJob } from '../common/CommonDto';
import { ChecklistState, JobStatus } from '../common/CommonEnum';
import { RouterKeys, toPath } from '../config/router/RouterKeys';
import { apiErrorMessage } from '../lib/apiError';
import { firstName } from '../lib/utils';
import { pendingOnboardingPath } from '../pages/auth/authRedirect';
import { useGetProviderHomeQuery } from '../pages/home/home.api';
import { callEmergency } from '../lib/safety';

/** What the active-job card says for each hired stage. The provider never starts before escrow is funded. */
const ACTIVE_COPY: Partial<Record<JobStatus, (job: NearbyJob) => { statusLabel: string; nextStep: string; actionLabel: string }>> = {
  [JobStatus.ACCEPTED]: () => ({
    statusLabel: 'You are hired',
    nextStep: "Waiting for the customer to pay into escrow. Don't start the work yet.",
    actionLabel: 'View job',
  }),
  [JobStatus.FUNDED]: () => ({
    statusLabel: 'Payment secured',
    nextStep: "When you arrive, enter the customer's start PIN to begin.",
    actionLabel: 'Start job',
  }),
  [JobStatus.IN_PROGRESS]: (job) => ({
    statusLabel: 'In progress',
    nextStep: `Next: upload proof for the ${Math.min(job.progressPct + 25, 100)}% stage and ask for approval.`,
    actionLabel: 'Upload proof',
  }),
};

/** Signed-in provider home: earnings, sign-up checklist, live job and nearby jobs to quote on. */
export const useProviderHome = (user: AuthUser): ProviderHomeLayoutProps => {
  const navigate = useNavigate();
  const { data, error, isLoading, refetch } = useGetProviderHomeQuery();

  if (isLoading) return { status: 'loading' };
  if (!data) return { status: 'error', message: apiErrorMessage(error), onRetry: refetch };

  const pendingStep = pendingOnboardingPath(user);
  const unfinished = data.checklist.some((item) => item.state !== ChecklistState.DONE);
  const active = data.activeJob;
  const copy = active && ACTIVE_COPY[active.status]?.(active);

  return {
    status: 'ready',
    firstName: firstName(user.name),
    earnings: data.earnings,
    pendingQuotes: data.quotes.pending,
    checklist: unfinished ? {
      items: data.checklist,
      lockedNote: data.canQuote
        ? 'ID and selfie checks open soon. You can already quote on nearby jobs.'
        : 'Quoting unlocks once your skills and service area are saved.',
      ...(pendingStep && { actionLabel: 'Continue sign-up', onAction: () => navigate(pendingStep) }),
    } : null,
    active: active && copy ? {
      eyebrow: 'Your active job',
      title: active.title,
      progressPct: active.progressPct,
      ...copy,
      onAction: () => navigate(toPath(RouterKeys.PRO_WORK, { id: active.id })),
      onSafety: callEmergency,
    } : null,
    nearby: {
      items: data.nearby.map((job) => ({ job, onOpen: () => navigate(toPath(RouterKeys.PRO_JOB_DETAIL, { id: job.id })) })),
      total: data.nearbyCount,
      onSeeAll: () => navigate(RouterKeys.PRO_JOBS),
    },
  };
};
