import { Alert, Input, Modal, Segmented, Table, Tabs } from 'antd';
import { RefreshCw } from 'lucide-react';
import { PaymentStatus } from '@/common/CommonEnum';
import { PAYMENT_BADGE } from '@/common/CommonLabels';
import { PageHeader } from '@/components/admin';
import { AlertBanner, EmptyState } from '@/components/ui';
import { formatINR } from '@/lib/utils';
import type { PaymentsLayoutProps } from '@/pages/admin/screens/payments/types/payments.dto';
import type { AdminPaymentRow, AdminPayout } from '@/pages/admin/types/admin.models';

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
                  columns={p.paymentColumns}
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
                  columns={p.payoutColumns}
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
