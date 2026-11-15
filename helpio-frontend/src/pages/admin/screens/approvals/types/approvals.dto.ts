import type { ColumnsType } from 'antd/es/table';
import type { WithStatus } from '@/common/CommonDto';
import type { ApprovalItem, ReasonDialogProps } from '@/pages/admin/types/admin.models';

/* The approvals admin screen: its layout's props. */

export type ApprovalFilter = 'all' | 'customer' | 'provider';

export interface ApprovalRow {
  item: ApprovalItem;
  roleLabel: string;
  /** e.g. "Signed up 28 Oct, 4:05 PM" */
  signedUp: string;
  /** Providers: e.g. ["Tap & leak repair, Wiring +2", "Koramangala 560034 · up to 5 km", "Works Mon, Sat"] */
  details: string[];
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}

export type ApprovalsProps = WithStatus<{
  filter: { value: ApprovalFilter; options: { value: ApprovalFilter; label: string }[]; onChange: (value: ApprovalFilter) => void };
  rows: ApprovalRow[];
  emptyText: string;
  dialog: ReasonDialogProps | null;
}>;

/** The layout gets the page's props and the table's columns (from approvals.colDef) */
export type ApprovalsLayoutProps = ApprovalsProps & { columns: ColumnsType<ApprovalRow> };
