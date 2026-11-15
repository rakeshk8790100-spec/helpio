import type { ColumnsType } from 'antd/es/table';
import type { WithStatus } from '@/common/CommonDto';
import type { KpiItem } from '@/pages/admin/screens/dashboard/types/dashboard.dto';
import type { HealthRow } from '@/pages/admin/types/admin.models';

/* The systemStatus admin screen: its layout's props. */

export type StatusProps = WithStatus<{
  summary: { ok: boolean; text: string };
  /** e.g. "Updated 4:05 PM · refreshes every 30 seconds" */
  updatedLabel: string;
  refreshing: boolean;
  onRefresh: () => void;
  services: HealthRow[];
  background: HealthRow[];
  attention: KpiItem[];
  errors: { id: string; when: string; count: number; route: string; errorType: string; message: string }[];
  /** e.g. "Development · version 0.1.0 · up since 28 Oct, 4:05 PM" */
  app: string;
}>;

/** One row of the table */
export type ErrorRow = Extract<StatusProps, { status: 'ready' }>['errors'][number];

/** The layout gets the page's props and the table's columns (from systemStatus.colDef) */
export type StatusLayoutProps = StatusProps & { columns: ColumnsType<ErrorRow> };
