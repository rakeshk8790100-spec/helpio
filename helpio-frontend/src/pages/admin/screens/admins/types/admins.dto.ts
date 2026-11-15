import type { ColumnsType } from 'antd/es/table';
import type { WithStatus } from '@/common/CommonDto';
import type { BadgeTone } from '@/components/ui/StatusBadge';
import type { AdminAccount, ReasonDialogProps } from '@/pages/admin/types/admin.models';

/* The admins admin screen: its layout's props. */

export interface AdminRowAction {
  label: string;
  danger?: boolean;
  primary?: boolean;
  onClick: () => void;
}

export interface AdminRow {
  admin: AdminAccount;
  badge: { label: string; tone: BadgeTone };
  /** e.g. "Asked 28 Oct, 4:05 PM" */
  since: string;
  /** Empty for the owner */
  actions: AdminRowAction[];
  /** An action on this row is running */
  busy: boolean;
}

export type AdminsProps = WithStatus<{
  rows: AdminRow[];
  pendingCount: number;
  dialog: ReasonDialogProps | null;
}>;

/** The layout gets the page's props and the table's columns (from admins.colDef) */
export type AdminsLayoutProps = AdminsProps & { columns: ColumnsType<AdminRow> };
