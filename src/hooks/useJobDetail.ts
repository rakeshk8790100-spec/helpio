import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { App } from 'antd';
import type { JobDetailLayoutProps } from '../client/default/jobs/jobs.layout.types';
import { JobStatus, QuoteStatus } from '../common/CommonEnum';
import { RouterKeys, toPath, withQuery } from '../config/router/RouterKeys';
import { apiErrorMessage } from '../lib/apiError';
import { useAcceptQuoteMutation, useDeclineQuoteMutation, useGetJobQuery, useResetStartPinMutation } from '../pages/jobs/jobs.api';
import { formatClock } from '../lib/utils';
import { jobBadge, jobFacts } from './jobItems';

/** /jobs/:id: the customer's job hub: details, photos, quotes to accept or decline, then the hired pro. */
export const useJobDetail = (id: string): JobDetailLayoutProps => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { data: job, error, isLoading, refetch } = useGetJobQuery(id);
  const [acceptQuote] = useAcceptQuoteMutation();
  const [declineQuote] = useDeclineQuoteMutation();
  const [resetPin, { isLoading: resetting }] = useResetStartPinMutation();
  const [acting, setActing] = useState<{ quoteId: string; action: 'accept' | 'reject' } | null>(null);

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
            .map((quote) => ({
              quote,
              cheapest: pending.length > 1 && quote.status === QuoteStatus.PENDING && quote.amount === lowest,
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
          nextStep: job.startedAt
            ? `${job.hired.providerLabel} is working on your job. Chat with them here.`
            : `${job.hired.providerLabel} has your job details and address. Share the PIN only when they're at your door: work starts with it.`,
          onOpen: () => navigate(toPath(RouterKeys.PRO_PROFILE, { id: job.hired!.providerId })),
          pin: job.startPin
            ? {
                value: job.startPin,
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
    invites: job.invites.map((invite) => ({
      invite,
      onOpen: () => navigate(toPath(RouterKeys.PRO_PROFILE, { id: invite.providerId })),
    })),
    onFindPros: job.status === JobStatus.OPEN ? () => navigate(withQuery(RouterKeys.SEARCH, job.categoryId ? { category: job.categoryId } : {})) : null,
    onBack: () => navigate(RouterKeys.JOBS),
  };
};
