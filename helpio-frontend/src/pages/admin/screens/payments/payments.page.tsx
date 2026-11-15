import { App } from 'antd';
import { useState } from 'react';
import { PaymentsLayout } from '@/clients';
import { PaymentStatus } from '@/common/CommonEnum';
import SuspenseWrapper from '@/components/wrapper/SuspenseWrapper';
import { useUrlParams } from '@/hooks/useUrlParams';
import { apiErrorMessage } from '@/lib/apiError';
import { formatINR } from '@/lib/utils';
import type { AdminPayout } from '@/pages/admin/types/admin.models';
import { useGetAdminPaymentsQuery, useGetPayoutsQuery, useMarkPayoutSentMutation, useRecheckPaymentMutation } from './payments.api';
import { paymentColumns, payoutColumns } from './payments.colDef';
import type { PaymentsProps } from './types/payments.dto';

const PAGE_SIZE = 25;

/** /admin/payments: payments (re-check a stuck one) and payouts (mark sent with a reference); the tab is `?tab=`. */
const useAdminPayments = (): PaymentsProps => {
  const { message } = App.useApp();
  const { params, update, page } = useUrlParams();
  const tab = params.get('tab') === 'payouts' ? 'payouts' : 'payments';
  const status = Object.values(PaymentStatus).find((s) => s === params.get('status')) ?? null;
  const payoutStatus = params.get('payout') === 'paid' ? 'paid' : 'pending';
  const payments = useGetAdminPaymentsQuery({ page, pageSize: PAGE_SIZE, status: status ?? undefined }, { skip: tab !== 'payments' });
  const payouts = useGetPayoutsQuery(payoutStatus, { skip: tab !== 'payouts' });
  const [recheck] = useRecheckPaymentMutation();
  const [markSent, { isLoading: sending }] = useMarkPayoutSentMutation();
  const [recheckingId, setRecheckingId] = useState<string | null>(null);
  const [sendFor, setSendFor] = useState<AdminPayout | null>(null);
  const [reference, setReference] = useState('');
  const [sendError, setSendError] = useState<string>();

  return {
    tab: { value: tab, onChange: (value) => update({ tab: value === 'payouts' ? 'payouts' : null, page: null }) },
    paymentStatus: { value: status, onChange: (value) => update({ status: value, page: null }) },
    payments: payments.isLoading || payments.isUninitialized
      ? { status: 'loading' }
      : !payments.data
        ? { status: 'error', message: apiErrorMessage(payments.error), onRetry: payments.refetch }
        : {
            status: 'ready',
            rows: payments.data.items,
            page: payments.data.page,
            pageSize: payments.data.pageSize,
            total: payments.data.total,
            fetching: payments.isFetching,
            onPageChange: (next) => update({ page: next > 1 ? String(next) : null }),
            recheckingId,
            onRecheck: async (id) => {
              setRecheckingId(id);
              try {
                const row = await recheck(id).unwrap();
                message.success(row.status === PaymentStatus.PAID ? 'Razorpay says it is paid. The job is complete.' : 'Checked with Razorpay: still open.');
              } catch (e) {
                message.error(apiErrorMessage(e));
              } finally {
                setRecheckingId(null);
              }
            },
          },
    payoutStatus: { value: payoutStatus, onChange: (value) => update({ payout: value === 'paid' ? 'paid' : null }) },
    payouts: payouts.isLoading || payouts.isUninitialized
      ? { status: 'loading' }
      : !payouts.data
        ? { status: 'error', message: apiErrorMessage(payouts.error), onRetry: payouts.refetch }
        : {
            status: 'ready',
            rows: payouts.data,
            onMarkSent: (payout) => {
              setReference('');
              setSendError(undefined);
              setSendFor(payout);
            },
          },
    markSent: sendFor && {
      payout: sendFor,
      reference,
      onReferenceChange: (value) => {
        setSendError(undefined);
        setReference(value);
      },
      sending,
      error: sendError,
      onCancel: () => setSendFor(null),
      onConfirm: async () => {
        const text = reference.trim();
        if (text.length < 3) return setSendError('Add the UTR or UPI reference of the transfer.');
        try {
          await markSent({ paymentId: sendFor.paymentId, reference: text }).unwrap();
          message.success(`Marked ${formatINR(sendFor.amount)} as sent. The pro was told.`);
          setSendFor(null);
        } catch (e) {
          setSendError(apiErrorMessage(e));
        }
      },
    },
  };
};

/** /admin/payments */
const PaymentsPage = () => {
  const props = useAdminPayments();
  return (
    <SuspenseWrapper>
      <PaymentsLayout
        {...props}
        paymentColumns={paymentColumns(props.payments.status === 'ready' ? props.payments : null)}
        payoutColumns={payoutColumns(props.payouts.status === 'ready' ? props.payouts.onMarkSent : null)}
      />
    </SuspenseWrapper>
  );
};

export default PaymentsPage;
