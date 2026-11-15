import { Button } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { RefreshCw } from 'lucide-react';
import { PAYMENT_BADGE, PAYOUT_BADGE } from '@/common/CommonLabels';
import { StatusBadge } from '@/components/ui';
import { formatClock, formatINR } from '@/lib/utils';
import type { AdminPaymentRow, AdminPayout } from '@/pages/admin/types/admin.models';

/** Payments table; open payments can be re-checked with Razorpay once the list has loaded. */
export const paymentColumns = (
  recheck: { recheckingId: string | null; onRecheck: (id: string) => void } | null,
): ColumnsType<AdminPaymentRow> => [
  {
    title: 'Job',
    render: (_, r) => (
      <span>
        <span className="block text-sm font-semibold text-slate-900">{r.jobTitle}</span>
        <span className="block text-xs text-slate-500">
          {r.customer} → {r.pro}
        </span>
      </span>
    ),
  },
  { title: 'Amount', width: 110, render: (_, r) => <span className="text-sm font-semibold text-slate-900">{formatINR(r.amount)}</span> },
  {
    title: 'Status',
    width: 180,
    render: (_, r) => (
      <span className="flex flex-wrap gap-1">
        <StatusBadge label={PAYMENT_BADGE[r.status].label} tone={PAYMENT_BADGE[r.status].tone} />
        {r.status === 'paid' && <StatusBadge label={PAYOUT_BADGE[r.payoutStatus].label} tone={PAYOUT_BADGE[r.payoutStatus].tone} />}
      </span>
    ),
  },
  {
    title: 'Tries',
    width: 220,
    render: (_, r) => (
      <span className="text-xs text-slate-600">
        {r.tries} {r.tries === 1 ? 'try' : 'tries'}
        {r.failedTries > 0 && `, ${r.failedTries} failed`}
        {r.method && ` · ${r.method}`}
        {r.lastError && <span className="block text-red-700">{r.lastError}</span>}
      </span>
    ),
  },
  { title: 'Started', width: 150, render: (_, r) => <span className="text-xs text-slate-500">{formatClock(r.createdAt)}</span> },
  {
    title: '',
    width: 120,
    align: 'right',
    render: (_, r) =>
      r.status === 'pending' && recheck ? (
        <Button
          size="small"
          icon={<RefreshCw size={12} />}
          loading={recheck.recheckingId === r.id}
          onClick={() => recheck.onRecheck(r.id)}
        >
          Re-check
        </Button>
      ) : null,
  },
];

/** Payouts table; one still to send can be marked as sent. */
export const payoutColumns = (onMarkSent: ((payout: AdminPayout) => void) | null): ColumnsType<AdminPayout> => [
  {
    title: 'Pro',
    render: (_, r) => (
      <span>
        <span className="block text-sm font-semibold text-slate-900">{r.providerName ?? r.providerEmail}</span>
        <span className="block text-xs text-slate-500">{[r.providerPhone, r.providerEmail].filter(Boolean).join(' · ')}</span>
      </span>
    ),
  },
  { title: 'Job', render: (_, r) => <span className="text-sm text-slate-700">{r.jobTitle}</span> },
  { title: 'Amount', width: 110, render: (_, r) => <span className="text-sm font-semibold text-slate-900">{formatINR(r.amount)}</span> },
  { title: 'Paid by customer', width: 160, render: (_, r) => <span className="text-xs text-slate-500">{r.paidAt ? formatClock(r.paidAt) : '–'}</span> },
  {
    title: '',
    width: 220,
    align: 'right',
    render: (_, r) =>
      r.payoutStatus === 'pending' && onMarkSent ? (
        <Button size="small" type="primary" onClick={() => onMarkSent(r)}>
          Mark as sent
        </Button>
      ) : (
        <span className="text-xs text-slate-500">
          Ref {r.payoutReference} · {r.payoutAt ? formatClock(r.payoutAt) : ''}
        </span>
      ),
  },
];
