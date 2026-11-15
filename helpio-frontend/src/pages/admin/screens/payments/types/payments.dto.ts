import type { ColumnsType } from 'antd/es/table';
import type { WithStatus } from '@/common/CommonDto';
import type { AdminPaymentRow, AdminPayout, PagedList } from '@/pages/admin/types/admin.models';

/* The payments admin screen: its layout's props. */

export interface PaymentsProps {
  tab: { value: 'payments' | 'payouts'; onChange: (value: 'payments' | 'payouts') => void };
  paymentStatus: { value: string | null; onChange: (value: string | null) => void };
  payments: WithStatus<PagedList<AdminPaymentRow> & { recheckingId: string | null; onRecheck: (id: string) => void }>;
  payoutStatus: { value: 'pending' | 'paid'; onChange: (value: 'pending' | 'paid') => void };
  payouts: WithStatus<{ rows: AdminPayout[]; onMarkSent: (payout: AdminPayout) => void }>;
  markSent: {
    payout: AdminPayout;
    reference: string;
    onReferenceChange: (value: string) => void;
    sending: boolean;
    error?: string;
    onConfirm: () => void;
    onCancel: () => void;
  } | null;
}

/** The layout gets the page's props and both tables' columns (from payments.colDef) */
export type PaymentsLayoutProps = PaymentsProps & {
  paymentColumns: ColumnsType<AdminPaymentRow>;
  payoutColumns: ColumnsType<AdminPayout>;
};
