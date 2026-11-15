import { Alert, Button, Input, Modal, Segmented, Table, Tabs } from 'antd';
import { RefreshCw } from 'lucide-react';
import type { AdminPaymentRow, AdminPayout } from '../../../common/CommonDto';
import { PaymentStatus } from '../../../common/CommonEnum';
import { PageHeader } from '../../../component/admin';
import { AlertBanner, EmptyState, StatusBadge } from '../../../component/ui';
import { formatClock, formatINR } from '../../../lib/utils';
import { PAYMENT_BADGE, PAYOUT_BADGE } from './adminBadges';
import type { PaymentsLayoutProps } from './admin.layout.types';

/** /admin/payments: every Razorpay payment (re-check a stuck one), and payouts to send to pros. */
const PaymentsLayout = (p: PaymentsLayoutProps) => (
  <div>
    <PageHeader
      title="Payments & payouts"
      description="Customers pay on Razorpay. Once paid, send the pro their money by UPI or bank transfer and record the reference."
    />
    <Tabs
      activeKey={p.tab.value}
      onChange={(key) => p.tab.onChange(key as 'payments' | 'payouts')}
      items={[
        {
          key: 'payments',
          label: 'Payments',
          children: (
            <div>
              <div className="mb-4">
                <Segmented
                  value={p.paymentStatus.value ?? 'all'}
                  onChange={(value) => p.paymentStatus.onChange(value === 'all' ? null : value)}
                  options={[
                    { value: 'all', label: 'All' },
                    ...Object.values(PaymentStatus).map((value) => ({ value, label: PAYMENT_BADGE[value].label })),
                  ]}
                />
              </div>
              {p.payments.status === 'error' ? (
                <AlertBanner message={p.payments.message} onRetry={p.payments.onRetry} />
              ) : (
                <Table<AdminPaymentRow>
                  rowKey="id"
                  loading={p.payments.status === 'loading' || p.payments.fetching}
                  dataSource={p.payments.status === 'ready' ? p.payments.rows : []}
                  className="rounded-2xl border border-slate-100 bg-white shadow-sm"
                  pagination={
                    p.payments.status === 'ready' && {
                      current: p.payments.page,
                      pageSize: p.payments.pageSize,
                      total: p.payments.total,
                      showSizeChanger: false,
                      onChange: p.payments.onPageChange,
                    }
                  }
                  columns={[
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
                        r.status === 'pending' && p.payments.status === 'ready' ? (
                          <Button
                            size="small"
                            icon={<RefreshCw size={12} />}
                            loading={p.payments.recheckingId === r.id}
                            onClick={() => p.payments.status === 'ready' && p.payments.onRecheck(r.id)}
                          >
                            Re-check
                          </Button>
                        ) : null,
                    },
                  ]}
                />
              )}
            </div>
          ),
        },
        {
          key: 'payouts',
          label: 'Payouts',
          children: (
            <div>
              <div className="mb-4">
                <Segmented
                  value={p.payoutStatus.value}
                  onChange={p.payoutStatus.onChange}
                  options={[
                    { value: 'pending', label: 'To send' },
                    { value: 'paid', label: 'Sent' },
                  ]}
                />
              </div>
              {p.payouts.status === 'error' ? (
                <AlertBanner message={p.payouts.message} onRetry={p.payouts.onRetry} />
              ) : p.payouts.status === 'ready' && p.payouts.rows.length === 0 ? (
                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                  <EmptyState Icon={RefreshCw} text={p.payoutStatus.value === 'pending' ? 'Nothing to send. Pros are all paid.' : 'No payouts sent yet.'} />
                </div>
              ) : (
                <Table<AdminPayout>
                  rowKey="paymentId"
                  loading={p.payouts.status === 'loading'}
                  dataSource={p.payouts.status === 'ready' ? p.payouts.rows : []}
                  pagination={false}
                  className="rounded-2xl border border-slate-100 bg-white shadow-sm"
                  columns={[
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
                        r.payoutStatus === 'pending' ? (
                          <Button size="small" type="primary" onClick={() => p.payouts.status === 'ready' && p.payouts.onMarkSent(r)}>
                            Mark as sent
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-500">
                            Ref {r.payoutReference} · {r.payoutAt ? formatClock(r.payoutAt) : ''}
                          </span>
                        ),
                    },
                  ]}
                />
              )}
            </div>
          ),
        },
      ]}
    />
    {p.markSent && (
      <Modal
        open
        title={`Sent ${formatINR(p.markSent.payout.amount)} to ${p.markSent.payout.providerName ?? p.markSent.payout.providerEmail}?`}
        okText="Mark as sent"
        confirmLoading={p.markSent.sending}
        onOk={p.markSent.onConfirm}
        onCancel={p.markSent.onCancel}
        destroyOnHidden
      >
        <div className="text-xs text-slate-500">The pro is told, with this reference.</div>
        <Input
          value={p.markSent.reference}
          onChange={(e) => p.markSent?.onReferenceChange(e.target.value)}
          placeholder="UTR or UPI reference"
          maxLength={80}
          className="!mt-3"
          aria-label="Reference"
        />
        {p.markSent.error && <Alert type="error" showIcon title={p.markSent.error} className="!mt-3" />}
      </Modal>
    )}
  </div>
);

export default PaymentsLayout;
