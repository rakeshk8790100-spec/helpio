import type { ColumnsType } from 'antd/es/table';
import type { WithStatus } from '@/common/CommonDto';
import type { BadgeTone } from '@/components/ui/StatusBadge';
import type { AuditEntry } from '@/pages/admin/types/admin.models';

/* The auditLog admin screen: its layout's props. */

export interface AuditLogProps {
  filter: { options: { value: string; label: string }[]; value: string | null; onChange: (value: string | null) => void };
  entries: WithStatus<{
    rows: (AuditEntry & { actionLabel: string; tone: BadgeTone; when: string })[];
    page: number;
    pageSize: number;
    total: number;
    fetching: boolean;
    onPageChange: (page: number) => void;
  }>;
}

/** One row of the table */
export type AuditRow = Extract<AuditLogProps['entries'], { status: 'ready' }>['rows'][number];

/** The layout gets the page's props and the table's columns (from auditLog.colDef) */
export type AuditLogLayoutProps = AuditLogProps & { columns: ColumnsType<AuditRow> };
