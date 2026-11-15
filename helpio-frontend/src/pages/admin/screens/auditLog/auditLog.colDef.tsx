import type { ColumnsType } from 'antd/es/table';
import { StatusBadge } from '@/components/ui';
import type { AuditRow } from './types/auditLog.dto';

/** The auditLog table: what each column shows for a row. */
export const auditLogColumns: ColumnsType<AuditRow> = [
  { title: 'When', width: 160, render: (_, row) => <span className="text-xs text-slate-500">{row.when}</span> },
  { title: 'Who', width: 200, render: (_, row) => <span className="text-sm text-slate-800">{row.actor ?? 'System'}</span> },
  { title: 'Action', width: 170, render: (_, row) => <StatusBadge label={row.actionLabel} tone={row.tone} /> },
  { title: 'What happened', render: (_, row) => <span className="text-sm text-slate-700">{row.summary}</span> },
  { title: 'IP', width: 130, render: (_, row) => <span className="font-mono text-xs text-slate-500">{row.ip ?? '–'}</span> },
];
