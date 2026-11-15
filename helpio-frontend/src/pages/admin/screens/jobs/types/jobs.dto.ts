import type { ColumnsType } from 'antd/es/table';
import type { WithStatus } from '@/common/CommonDto';
import { JobStatus } from '@/common/CommonEnum';
import type { AdminJobDetail, AdminJobRow, DrawerProps, PagedList, ReasonDialogProps } from '@/pages/admin/types/admin.models';

/* The jobs admin screen: its layout's props. */

export interface JobsAdminProps {
  status: { value: JobStatus | null; onChange: (value: JobStatus | null) => void };
  search: { value: string; onChange: (value: string) => void; onSearch: (value: string) => void };
  list: WithStatus<PagedList<AdminJobRow> & { onOpen: (id: string) => void }>;
  detail: DrawerProps<{
    job: AdminJobDetail;
    onCancel: (() => void) | null;
    chat: { open: boolean; loading: boolean; messages: { id: string; sender: string; body: string; at: string }[] | null; onRead: () => void; onClose: () => void };
  }>;
  dialog: ReasonDialogProps | null;
}

/** The layout gets the page's props and the table's columns (from jobs.colDef) */
export type JobsAdminLayoutProps = JobsAdminProps & { columns: ColumnsType<AdminJobRow> };
