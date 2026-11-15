import type { ColumnsType } from 'antd/es/table';
import type { WithStatus } from '@/common/CommonDto';
import { ApprovalStatus } from '@/common/CommonEnum';
import type { AdminUserDetail, AdminUserRow, DrawerProps, PagedList, ReasonDialogProps } from '@/pages/admin/types/admin.models';

/* The users admin screen: its layout's props. */

export interface UsersProps {
  role: { value: 'all' | 'customer' | 'provider'; onChange: (value: 'all' | 'customer' | 'provider') => void };
  approval: { value: ApprovalStatus | null; onChange: (value: ApprovalStatus | null) => void };
  active: { value: 'all' | 'active' | 'off'; onChange: (value: 'all' | 'active' | 'off') => void };
  search: { value: string; onChange: (value: string) => void; onSearch: (value: string) => void };
  list: WithStatus<PagedList<AdminUserRow> & { onOpen: (id: string) => void }>;
  detail: DrawerProps<{ user: AdminUserDetail; busy: boolean; onDeactivate: () => void; onActivate: () => void; onSignOut: () => void }>;
  dialog: ReasonDialogProps | null;
}

/** The layout gets the page's props and the table's columns (from users.colDef) */
export type UsersLayoutProps = UsersProps & { columns: ColumnsType<AdminUserRow> };
