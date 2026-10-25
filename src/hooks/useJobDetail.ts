import { useNavigate } from 'react-router-dom';
import type { JobDetailLayoutProps } from '../client/default/jobs/jobs.layout.types';
import { JobStatus, QuoteStatus } from '../common/CommonEnum';
import { RouterKeys, toPath, withQuery } from '../config/router/RouterKeys';
import { apiErrorMessage } from '../lib/apiError';
import { useGetJobQuery } from '../pages/jobs/jobs.api';
import { jobBadge, jobFacts } from './jobItems';

/** /jobs/:id: the customer's job hub. In this phase: details, photos and the quotes received. */
export const useJobDetail = (id: string): JobDetailLayoutProps => {
  const navigate = useNavigate();
  const { data: job, error, isLoading, refetch } = useGetJobQuery(id);

  if (isLoading) return { status: 'loading' };
  if (!job) return { status: 'error', message: apiErrorMessage(error), onRetry: refetch };

  const isDraft = job.status === JobStatus.DRAFT;
  const pending = job.quotes.filter((q) => q.status === QuoteStatus.PENDING);
  const lowest = Math.min(...pending.map((q) => q.amount));

  return {
    status: 'ready',
    summary: {
      title: job.title,
      badge: jobBadge(job),
      isEmergency: job.isEmergency,
      edited: job.editedAt !== null,
      facts: jobFacts(job, [job.areaName, job.pincode].filter(Boolean).join(' ') || null),
      description: job.description,
      photos: job.attachments,
    },
    draft: isDraft ? { onContinue: () => navigate(withQuery(RouterKeys.POST_JOB, { job: job.id })) } : null,
    edit:
      job.status === JobStatus.OPEN
        ? { onEdit: () => navigate(withQuery(RouterKeys.POST_JOB, { job: job.id })), hasQuotes: pending.length > 0 }
        : null,
    quotes: isDraft
      ? null
      : {
          // Cheapest first, so the comparison reads top-down
          items: [...job.quotes]
            .sort((a, b) => a.amount - b.amount)
            .map((quote) => ({ quote, cheapest: pending.length > 1 && quote.status === QuoteStatus.PENDING && quote.amount === lowest })),
          lockedNote: 'Accepting a quote and paying into escrow arrives in the next update. Compare quotes for now.',
        },
    invites: job.invites.map((invite) => ({
      invite,
      onOpen: () => navigate(toPath(RouterKeys.PRO_PROFILE, { id: invite.providerId })),
    })),
    onFindPros: job.status === JobStatus.OPEN ? () => navigate(withQuery(RouterKeys.SEARCH, job.categoryId ? { category: job.categoryId } : {})) : null,
    onBack: () => navigate(RouterKeys.JOBS),
  };
};
