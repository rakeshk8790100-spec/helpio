import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { App, Form } from 'antd';
import type { ProviderJobLayoutProps, ProviderQuoteProps, QuoteFormValues } from '../client/default/jobs/jobs.layout.types';
import type { AuthUser } from '../common/CommonDto';
import { JobStatus, QuoteStatus } from '../common/CommonEnum';
import { RouterKeys, toPath, withQuery } from '../config/router/RouterKeys';
import { estimateOptions, formatClock } from '../lib/utils';
import { apiErrorMessage } from '../lib/apiError';
import { pendingOnboardingPath } from '../pages/auth/authRedirect';
import {
  useCreateQuoteMutation,
  useDeclineInviteMutation,
  useGetNearbyJobQuery,
  useStartJobMutation,
  useWithdrawQuoteMutation,
} from '../pages/jobs/jobs.api';
import { jobBadge, jobFacts } from './jobItems';
import { useJobPayment } from './useJobPayment';
import { useJobProgress } from './useJobProgress';
import { useJobReview } from './useJobReview';

/** Built-in quote notes; saved personal templates can replace these later */
const QUICK_MESSAGES = [
  'I can come today and finish it in one visit.',
  'Price includes labour. Any parts are extra, at actual cost with bills.',
  "I've done this many times and can share photos of past work.",
];

/** /pro/jobs/:id: a nearby job, masked before hire, and the provider's quote (send, or withdraw a pending one). */
export const useProviderJob = (id: string, user: AuthUser): ProviderJobLayoutProps => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { data: job, error, isLoading, refetch } = useGetNearbyJobQuery(id);
  const [createQuote, { isLoading: submitting }] = useCreateQuoteMutation();
  const [withdrawQuote, { isLoading: withdrawing }] = useWithdrawQuoteMutation();
  const [declineInvite, { isLoading: declining }] = useDeclineInviteMutation();
  const [startJob, { isLoading: starting }] = useStartJobMutation();
  const [pin, setPin] = useState('');
  // Prefilled from the job's own duration until the pro picks
  const [estimate, setEstimate] = useState<number | null>(null);
  const [startError, setStartError] = useState<string>();
  const [form] = Form.useForm<QuoteFormValues>();
  const [quoteError, setQuoteError] = useState<string>();
  const customerName = job?.customerName ?? job?.customerLabel ?? 'the customer';
  const progress = useJobProgress(id, 'provider', { skip: !job?.hired, otherName: customerName });
  // All four stages approved: the customer's payment, and rating them
  const workDone = Boolean(job?.hired) && (job?.status === JobStatus.PAYMENT_DUE || job?.status === JobStatus.COMPLETED);
  const payment = useJobPayment(id, 'provider', { skip: !workDone, otherName: customerName });
  const review = useJobReview(id, 'provider', { skip: !workDone, otherName: customerName });

  if (isLoading) return { status: 'loading' };
  if (!job) return { status: 'error', message: apiErrorMessage(error), onRetry: refetch };

  const mine = job.myQuote;
  // A sent (or accepted) quote shows first: the sign-up lock only matters before quoting
  const quote: ProviderQuoteProps = mine && mine.status !== QuoteStatus.WITHDRAWN
    ? {
          state: 'sent',
          quote: mine,
          changedSince: job.editedAfterMyQuote,
          withdrawing,
          onWithdraw: async () => {
            try {
              await withdrawQuote(job.id).unwrap();
              message.success('Quote withdrawn. You can send a new one.');
            } catch (e) {
              message.error(apiErrorMessage(e));
            }
          },
        }
    : !job.canQuote
      ? {
          state: 'locked',
          reason: 'Quoting unlocks once your skills and service area are saved.',
          actionLabel: 'Finish sign-up',
          onAction: () => navigate(pendingOnboardingPath(user) ?? RouterKeys.ONBOARDING_SKILLS),
        }
      : {
          state: 'form',
          form,
          // A withdrawn quote comes back as the starting point
          initialValues: { amount: mine?.amount ?? job.budget ?? undefined, message: mine?.message ?? undefined },
          budget: job.budget,
          onSameAsBudget: () => job.budget !== null && form.setFieldValue('amount', job.budget),
          quickMessages: QUICK_MESSAGES,
          onQuickMessage: (text) => form.setFieldValue('message', text),
          submitting,
          error: quoteError,
          onSubmit: async ({ amount, message: note }) => {
            setQuoteError(undefined);
            try {
              await createQuote({ jobId: job.id, amount, message: note?.trim() || null }).unwrap();
              message.success("Quote sent. We'll let you know if the customer accepts.");
            } catch (e) {
              setQuoteError(apiErrorMessage(e));
            }
          },
        };

  return {
    status: 'ready',
    summary: {
      title: job.title,
      badge: jobBadge(job),
      isEmergency: job.isEmergency,
      edited: job.editedAfterMyQuote,
      facts: jobFacts(job, [job.approxDistanceKm !== null && `~${job.approxDistanceKm} km`, job.areaName].filter(Boolean).join(' · ') || null),
      description: job.description,
      photos: job.attachments,
      customerLabel: job.customerLabel,
      quoteCount: job.quoteCount,
      customerRating:
        job.customerRating.count > 0 && job.customerRating.average !== null
          ? { average: job.customerRating.average, count: job.customerRating.count }
          : null,
    },
    hired: job.hired
      ? {
          customerName: job.customerName ?? job.customerLabel,
          address: [job.exactLocation?.areaName, job.exactLocation?.pincode].filter(Boolean).join(' ') || 'Address not given',
          coordinates: job.exactLocation?.coordinates ?? null,
          start:
            job.status === JobStatus.ACCEPTED
              ? {
                  pin,
                  onPinChange: (value) => {
                    setStartError(undefined);
                    setPin(value);
                  },
                  estimate: {
                    options: estimateOptions(job.durationMins),
                    value: estimate ?? job.durationMins,
                    onChange: (minutes) => {
                      setStartError(undefined);
                      setEstimate(minutes);
                    },
                  },
                  starting,
                  error: startError,
                  onStart: async () => {
                    if (!/^\d{4}$/.test(pin)) return setStartError('Enter the 4-digit PIN from the customer.');
                    const estimatedMins = estimate ?? job.durationMins;
                    if (!estimatedMins) return setStartError('Pick how long the job will take.');
                    try {
                      await startJob({ jobId: job.id, pin, estimatedMins }).unwrap();
                      message.success('Job started. Good luck!');
                    } catch (e) {
                      setPin('');
                      setStartError(apiErrorMessage(e));
                    }
                  },
                }
              : null,
          startedLabel: job.startedAt ? `In progress since ${formatClock(job.startedAt)}` : null,
          chat: { unread: job.unreadMessages, onOpen: () => navigate(toPath(RouterKeys.PRO_JOB_CHAT, { id: job.id })) },
        }
      : null,
    invite:
      !job.hired && job.inviteStatus !== null
        ? {
            message: job.inviteMessage,
            declining,
            onDecline: async () => {
              try {
                await declineInvite(job.id).unwrap();
                message.success("Request declined. We'll let the customer know.");
                navigate(RouterKeys.PRO_JOBS);
              } catch (e) {
                message.error(apiErrorMessage(e));
              }
            },
          }
        : null,
    progress,
    payment,
    review,
    circle: job.areaCircle,
    quote,
    onBack: () =>
      navigate(
        job.hired
          ? withQuery(RouterKeys.PRO_JOBS, { tab: job.status === JobStatus.COMPLETED ? 'completed' : 'active' })
          : RouterKeys.PRO_JOBS,
      ),
  };
};
