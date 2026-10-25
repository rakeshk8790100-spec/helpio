import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { App, Form } from 'antd';
import type { ProviderJobLayoutProps, ProviderQuoteProps, QuoteFormValues } from '../client/default/jobs/jobs.layout.types';
import type { AuthUser } from '../common/CommonDto';
import { QuoteStatus } from '../common/CommonEnum';
import { RouterKeys } from '../config/router/RouterKeys';
import { apiErrorMessage } from '../lib/apiError';
import { pendingOnboardingPath } from '../pages/auth/authRedirect';
import {
  useCreateQuoteMutation,
  useDeclineInviteMutation,
  useGetNearbyJobQuery,
  useWithdrawQuoteMutation,
} from '../pages/jobs/jobs.api';
import { jobBadge, jobFacts } from './jobItems';

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
  const [form] = Form.useForm<QuoteFormValues>();
  const [quoteError, setQuoteError] = useState<string>();

  if (isLoading) return { status: 'loading' };
  if (!job) return { status: 'error', message: apiErrorMessage(error), onRetry: refetch };

  const mine = job.myQuote;
  const quote: ProviderQuoteProps = !job.canQuote
    ? {
        state: 'locked',
        reason: 'Quoting unlocks once your skills and service area are saved.',
        actionLabel: 'Finish sign-up',
        onAction: () => navigate(pendingOnboardingPath(user) ?? RouterKeys.ONBOARDING_SKILLS),
      }
    : mine && mine.status !== QuoteStatus.WITHDRAWN
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
    },
    invite:
      job.inviteStatus !== null
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
    circle: job.areaCircle,
    quote,
    onBack: () => navigate(RouterKeys.PRO_JOBS),
  };
};
