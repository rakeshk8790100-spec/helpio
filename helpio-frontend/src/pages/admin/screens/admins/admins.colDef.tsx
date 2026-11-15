import { Button } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Crown } from 'lucide-react';
import { Avatar, StatusBadge } from '@/components/ui';
import type { AdminRow } from './types/admins.dto';

/** The admins table: what each column shows for a row. */
export const adminsColumns: ColumnsType<AdminRow> = [
  {
    title: 'Admin',
    render: (_, { admin }) => (
      <span className="flex items-center gap-3">
        <Avatar name={admin.name ?? admin.email} size="sm" />
        <span className="min-w-0">
          <span className="flex items-center gap-1 text-sm font-semibold text-slate-900">
            {admin.name ?? admin.email}
            {admin.isOwner && <Crown size={14} className="text-amber-500" aria-label="Owner" />}
          </span>
          <span className="block text-xs text-slate-500">{admin.email}</span>
        </span>
      </span>
    ),
  },
  { title: 'Mobile', render: (_, { admin }) => <span className="text-sm text-slate-700">{admin.phone ?? '–'}</span> },
  {
    title: 'Status',
    render: (_, row) => (
      <span className="flex flex-col items-start gap-1">
        <StatusBadge label={row.badge.label} tone={row.badge.tone} />
        {row.admin.approvalNote && <span className="text-[11px] text-slate-500">"{row.admin.approvalNote}"</span>}
      </span>
    ),
  },
  { title: 'Since', render: (_, row) => <span className="text-xs text-slate-500">{row.since}</span> },
  {
    title: '',
    align: 'right',
    render: (_, row) => (
      <span className="flex justify-end gap-2">
        {row.actions.map((action) => (
          <Button
            key={action.label}
            size="small"
            type={action.primary ? 'primary' : 'default'}
            danger={action.danger}
            disabled={row.busy}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        ))}
      </span>
    ),
  },
];
