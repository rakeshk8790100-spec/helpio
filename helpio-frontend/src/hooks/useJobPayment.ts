import { App } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { PaymentAttempt } from '@/common/CommonDto';
import { JobStatus, PaymentAttemptStatus, PaymentStatus, PayoutStatus } from '@/common/CommonEnum';
import { paymentMethodLabel } from '@/common/CommonLabels';
import type { BadgeTone } from '@/components/ui';
import { poll, list, one } from '@/config/base_service/base.api';
import { apiErrorMessage } from '@/lib/apiError';
import { formatClock, formatINR } from '@/lib/utils';
import { jobsApi, useConfirmJobPaymentMutation, useGetJobPaymentQuery, useStartJobPaymentMutation } from '@/pages/jobs/jobs.api';
import type { JobPaymentProps, PaymentTry, PaymentReturn } from '@/pages/jobs/types/jobs.dto';
import { useAppDispatch } from '@/redux';

type Role = 'customer' | 'provider';

// Picks up a payment confirmed by Razorpay's webhook, or made on another phone, without reloading
const POLL_MS = 30_000;
// What Razorpay adds to the job's address when it sends the customer back after paying
const RETURN_KEYS = [
  'razorpay_payment_id',
  'razorpay_payment_link_id',
  'razorpay_payment_link_reference_id',
  'razorpay_payment_link_status',
  'razorpay_signature',
] as const;


const TRY_BADGE: Record<PaymentAttemptStatus, { label: string; tone: BadgeTone }> = {
  [PaymentAttemptStatus.CREATED]: { label: 'Started', tone: 'neutral' },
  [PaymentAttemptStatus.AUTHORIZED]: { label: 'Processing', tone: 'warning' },
  [PaymentAttemptStatus.CAPTURED]: { label: 'Paid', tone: 'success' },
  [PaymentAttemptStatus.REFUNDED]: { label: 'Refunded', tone: 'neutral' },
  [PaymentAttemptStatus.FAILED]: { label: 'Failed', tone: 'error' },
};

const toTry = (a: PaymentAttempt): PaymentTry => ({
  id: a.id,
  badge: TRY_BADGE[a.status],
  meta: [paymentMethodLabel(a.method)?.replace(/^\w/, (c) => c.toUpperCase()), formatClock(a.attemptedAt)].filter(Boolean).join(' · '),
  reason: a.status === PaymentAttemptStatus.FAILED ? a.errorDescription : null,
});

/** Razorpay's parameters as one string (stable for effects), or null when the customer didn't just come back */
const returnKey = (params: URLSearchParams) => {
  const values = RETURN_KEYS.map((key) => params.get(key));
  return values.every(Boolean) ? JSON.stringify(Object.fromEntries(RETURN_KEYS.map((key, i) => [key, values[i]]))) : null;
};

interface Options {
  /** Nothing to pay until all four stages are approved */
  skip: boolean;
  /** The other person, e.g. "Ravi S." */
  otherName: string;
}

/** After 100%: the customer pays the hired quote on Razorpay's page; the pro sees it, then Helpio's transfer. */
export const useJobPayment = (jobId: string, role: Role, { skip, otherName }: Options): JobPaymentProps | null => {
  const { message } = App.useApp();
  const dispatch = useAppDispatch();
  const [params, setParams] = useSearchParams();
  const { data, error, isLoading, refetch } = useGetJobPaymentQuery(jobId, { skip, ...poll(skip ? 0 : POLL_MS) });
  const [startPayment, { isLoading: starting }] = useStartJobPaymentMutation();
  const [confirmPayment, { isLoading: confirming }] = useConfirmJobPaymentMutation();
  // Razorpay's page is loading: keep the button busy until the browser leaves
  const [redirecting, setRedirecting] = useState(false);

  // Back from Razorpay: confirm once, then drop its parameters so a reload doesn't repeat it
  const back = role === 'customer' ? returnKey(params) : null;
  const confirmed = useRef<string | null>(null);
  useEffect(() => {
    if (!back || confirmed.current === back) return;
    confirmed.current = back;
    setParams(
      (current) => {
        RETURN_KEYS.forEach((key) => current.delete(key));
        return current;
      },
      { replace: true },
    );
    confirmPayment({ jobId, params: JSON.parse(back) as PaymentReturn })
      .unwrap()
      .then((payment) =>
        payment.status === PaymentStatus.PAID
          ? message.success('Payment received. Your job is complete!')
          : message.info("Razorpay hasn't confirmed the payment yet. This page updates by itself."),
      )
      .catch((e) => message.error(apiErrorMessage(e)));
  }, [back, confirmPayment, jobId, message, setParams]);

  // Paid while the page was open (webhook or another phone): refresh the job and its stages too
  const paid = data?.status === PaymentStatus.PAID;
  const seenPaid = useRef<boolean | null>(null);
  useEffect(() => {
    if (!data) return;
    if (seenPaid.current === false && paid) dispatch(jobsApi.util.invalidateTags([one('Jobs', jobId), list('Jobs'), one('Milestones', jobId)]));
    seenPaid.current = paid;
  }, [data, paid, dispatch, jobId]);

  if (skip) return null;
  if (isLoading) return { status: 'loading' };
  if (!data) return { status: 'error', message: apiErrorMessage(error), onRetry: refetch };
  // Jobs finished before payments existed have nothing to show
  if (!paid && data.jobStatus !== JobStatus.PAYMENT_DUE) return null;

  const amount = formatINR(data.amount);
  const via = paymentMethodLabel(data.method);
  const paidLine = `Paid${via ? ` by ${via}` : ''}${data.paidAt ? ` on ${formatClock(data.paidAt)}` : ''}.`;
  const base = { status: 'ready' as const, lastError: null, pay: null, confirming: false, tries: [] };

  if (role === 'provider') {
    if (!paid) {
      return {
        ...base,
        tone: 'waiting',
        title: `Waiting for ${otherName} to pay ${amount}`,
        badge: { label: 'Waiting for payment', tone: 'warning' },
        text: 'All four stages are approved. Once they pay, Helpio sends the money to you.',
      };
    }
    const sent = data.payout?.status === PayoutStatus.PAID;
    return {
      ...base,
      tone: 'done',
      title: sent ? `Helpio sent you ${amount}` : `${otherName} paid ${amount}`,
      badge: sent ? { label: 'Sent to you', tone: 'success' } : { label: 'Transfer pending', tone: 'warning' },
      text: sent
        ? [data.payout?.reference && `Reference ${data.payout.reference}`, data.payout?.sentAt && formatClock(data.payout.sentAt)]
            .filter(Boolean)
            .join(' · ') || 'The money is on its way to you.'
        : "Helpio will send the money to you soon. You'll get a notification with the reference.",
    };
  }

  if (paid) {
    return {
      ...base,
      tone: 'done',
      title: `Paid ${amount}`,
      badge: { label: 'Paid', tone: 'success' },
      text: `${paidLine} Your job is complete. Thanks for using Helpio!`,
    };
  }
  return {
    status: 'ready',
    tone: 'due',
    title: `Pay ${amount} to finish`,
    badge: { label: 'Payment due', tone: 'warning' },
    text: "All four stages are approved. Pay with UPI (Google Pay, PhonePe or any UPI app, or scan the QR code) or netbanking on Razorpay's secure page. You'll come back here after paying.",
    lastError: data.lastError,
    pay: data.canPay
      ? {
          label: `Pay ${amount}`,
          starting: starting || redirecting,
          onPay: async () => {
            try {
              const { shortUrl } = await startPayment(jobId).unwrap();
              setRedirecting(true);
              window.location.assign(shortUrl);
            } catch (e) {
              message.error(apiErrorMessage(e));
            }
          },
        }
      : null,
    confirming,
    tries: data.attempts.some((a) => a.status === PaymentAttemptStatus.FAILED) ? data.attempts.map(toTry) : [],
  };
};
