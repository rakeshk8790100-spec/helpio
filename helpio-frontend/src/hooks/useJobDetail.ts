import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { App } from 'antd';
import type { JobDetailLayoutProps } from '../client/default/jobs/jobs.layout.types';
import { JobStatus, QuoteStatus } from '../common/CommonEnum';
import { RouterKeys, toPath, withQuery } from '../config/router/RouterKeys';
import { apiErrorMessage } from '../lib/apiError';
import {
  jobsApi,
  useAcceptQuoteMutation,
  useDeclineQuoteMutation,
  useDeleteJobMutation,
  useGetJobQuery,
  useResetStartPinMutation,
} from '../pages/jobs/jobs.api';
import { formatClock } from '../lib/utils';
import { LIVE, jobBadge, jobFacts, livePollMs } from './jobItems';
import { useJobPayment } from './useJobPayment';
import { useJobProgress } from './useJobProgress';
import { useJobReview } from './useJobReview';

/** /jobs/:id: the customer's job hub: details, photos, quotes to accept or decline, then the hired pro. */
export const useJobDetail = (id: string): JobDetailLayoutProps => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  // The cached status sets the polling speed, so new quotes and the pro's updates show up without a reload
  const status = jobsApi.endpoints.getJob.useQueryState(id).data?.status;
  const { data: job, error, isLoading, refetch } = useGetJobQuery(id, { ...LIVE, pollingInterval: livePollMs(status) });
  const [acceptQuote] = useAcceptQuoteMutation();
  const [declineQuote] = useDeclineQuoteMutation();
  const [resetPin, { isLoading: resetting }] = useResetStartPinMutation();
  const [deleteJob, { isLoading: deleting }] = useDeleteJobMutation();
  const [acting, setActing] = useState<{ quoteId: string; action: 'accept' | 'reject' } | null>(null);
  const proName = job?.hired?.providerLabel ?? 'Your pro';
  const progress = useJobProgress(id, 'customer', { skip: !job?.hired, otherName: proName });
  // All four stages approved: pay, and rate the pro
  const workDone = Boolean(job?.hired) && (job?.status === JobStatus.PAYMENT_DUE || job?.status === JobStatus.COMPLETED);
  const payment = useJobPayment(id, 'customer', { skip: !workDone, otherName: proName });
  const review = useJobReview(id, 'customer', { skip: !workDone, otherName: proName });

  if (isLoading) return { status: 'loading' };
  if (!job) return { status: 'error', message: apiErrorMessage(error), onRetry: refetch };

  const isDraft = job.status === JobStatus.DRAFT;
  const pending = job.quotes.filter((q) => q.status === QuoteStatus.PENDING);
  const lowest = Math.min(...pending.map((q) => q.amount));
  const answer = (quoteId: string, action: 'accept' | 'reject', providerLabel: string) => async () => {
    setActing({ quoteId, action });
    try {
      if (action === 'accept') {
        await acceptQuote({ jobId: job.id, quoteId }).unwrap();
        message.success(`${providerLabel} is hired. We've let the other pros know.`);
      } else {
        await declineQuote({ jobId: job.id, quoteId }).unwrap();
        message.success('Quote declined.');
      }
    } catch (e) {
      message.error(apiErrorMessage(e));
    } finally {
      setActing(null);
    }
  };
  const isOpen = job.status === JobStatus.OPEN;

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
    draft: isDraft
      ? {
          onContinue: () => navigate(withQuery(RouterKeys.POST_JOB, { job: job.id })),
          deleting,
          onDelete: async () => {
            try {
              await deleteJob(job.id).unwrap();
              message.success('Draft deleted.');
              navigate(RouterKeys.JOBS, { replace: true });
            } catch (e) {
              message.error(apiErrorMessage(e));
            }
          },
        }
      : null,
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
            .map((quote) => ({
              quote,
              cheapest: pending.length > 1 && quote.status === QuoteStatus.PENDING && quote.amount === lowest,
              // Without an id (stale data) there's no profile to open, rather than a broken /pros/id link
              onOpenPro: quote.providerId ? () => navigate(toPath(RouterKeys.PRO_PROFILE, { id: quote.providerId })) : undefined,
              ...(isOpen && quote.status === QuoteStatus.PENDING && {
                onAccept: answer(quote.id, 'accept', quote.providerLabel),
                onReject: answer(quote.id, 'reject', quote.providerLabel),
              }),
              acting: acting?.quoteId === quote.id ? acting.action : null,
            })),
          busy: acting !== null,
        },
    hired: job.hired
      ? {
          pro: job.hired,
          nextStep: job.status === JobStatus.COMPLETED
            ? `${job.hired.providerLabel} finished your job. Every stage is approved below.`
            : job.status === JobStatus.PAYMENT_DUE
            ? `${job.hired.providerLabel} finished all four stages. Pay below to complete the job.`
            : job.startedAt
            ? `${job.hired.providerLabel} is working on your job. You'll approve each 25% with photos below.`
            : `${job.hired.providerLabel} has your job details and address. Share the PIN only when they're at your door: work starts with it.`,
          onOpen: () => navigate(toPath(RouterKeys.PRO_PROFILE, { id: job.hired!.providerId })),
          pin: job.startPin
            ? {
                value: job.startPin,
                locked: job.pinLocked,
                resetting,
                onReset: async () => {
                  try {
                    await resetPin(job.id).unwrap();
                    message.success('New PIN ready. The old one no longer works.');
                  } catch (e) {
                    message.error(apiErrorMessage(e));
                  }
                },
              }
            : null,
          startedLabel: job.startedAt ? `Work started at ${formatClock(job.startedAt)}` : null,
          chat: { unread: job.unreadMessages, onOpen: () => navigate(toPath(RouterKeys.JOB_CHAT, { id: job.id })) },
        }
      : null,
    progress,
    payment,
    review,
    invites: job.invites.map((invite) => ({
      invite,
      onOpen: () => navigate(toPath(RouterKeys.PRO_PROFILE, { id: invite.providerId })),
    })),
    onFindPros: job.status === JobStatus.OPEN ? () => navigate(withQuery(RouterKeys.SEARCH, job.categoryId ? { category: job.categoryId } : {})) : null,
    onBack: () => navigate(RouterKeys.JOBS),
  };
};
