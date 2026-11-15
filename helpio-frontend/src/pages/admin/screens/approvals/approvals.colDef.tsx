import { Button } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Avatar, StatusBadge } from '@/components/ui';
import type { ApprovalRow } from './types/approvals.dto';

/** The approvals table: what each column shows for a row. */
export const approvalsColumns: ColumnsType<ApprovalRow> = [
  {
    title: 'Person',
    render: (_, { item }) => (
      <span className="flex items-center gap-3">
        <Avatar name={item.name ?? item.email} size="sm" />
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-slate-900">{item.name ?? item.email}</span>
          <span className="block text-xs text-slate-500">{item.email}</span>
        </span>
      </span>
    ),
  },
  {
    title: 'Role',
    width: 110,
    render: (_, row) => <StatusBadge label={row.roleLabel} tone={row.item.role === 'provider' ? 'brand' : 'neutral'} />,
  },
  { title: 'Mobile', width: 140, render: (_, { item }) => <span className="text-sm text-slate-700">{item.phone ?? '–'}</span> },
  {
    title: 'Details',
    render: (_, row) =>
      row.details.length ? (
        <span className="flex flex-col gap-0.5 text-xs text-slate-600">
          {row.details.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </span>
      ) : (
        <span className="text-xs text-slate-400">–</span>
      ),
  },
  { title: 'Signed up', width: 170, render: (_, row) => <span className="text-xs text-slate-500">{row.signedUp}</span> },
  {
    title: '',
    width: 190,
    align: 'right',
    render: (_, row) => (
      <span className="flex justify-end gap-2">
        <Button size="small" danger disabled={row.busy} onClick={row.onReject}>
          Reject
        </Button>
        <Button size="small" type="primary" loading={row.busy} onClick={row.onApprove}>
          Approve
        </Button>
      </span>
    ),
  },
];
