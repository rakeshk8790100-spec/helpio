import type { ColumnsType } from 'antd/es/table';
import { JOB_STATUS_BADGE } from '@/common/CommonLabels';
import { StatusBadge } from '@/components/ui';
import { formatClock, formatINR } from '@/lib/utils';
import type { AdminJobRow } from '@/pages/admin/types/admin.models';

/** The jobs table: what each column shows for a row. */
export const jobsColumns: ColumnsType<AdminJobRow> = [
  {
    title: 'Job',
    render: (_, j) => (
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-900">{j.title}</span>
        <span className="block text-xs text-slate-500">{[j.category, j.area].filter(Boolean).join(' · ') || '–'}</span>
      </span>
    ),
  },
  { title: 'Stage', width: 170, render: (_, j) => <StatusBadge label={JOB_STATUS_BADGE[j.status].label} tone={JOB_STATUS_BADGE[j.status].tone} /> },
  { title: 'Customer', width: 160, render: (_, j) => <span className="text-sm text-slate-700">{j.customer}</span> },
  { title: 'Pro', width: 160, render: (_, j) => <span className="text-sm text-slate-700">{j.pro ?? '–'}</span> },
  { title: 'Amount', width: 110, render: (_, j) => <span className="text-sm text-slate-800">{j.amount !== null ? formatINR(j.amount) : '–'}</span> },
  { title: 'Done', width: 70, render: (_, j) => <span className="text-sm text-slate-700">{j.progressPct}%</span> },
  { title: 'Updated', width: 160, render: (_, j) => <span className="text-xs text-slate-500">{formatClock(j.updatedAt)}</span> },
];
