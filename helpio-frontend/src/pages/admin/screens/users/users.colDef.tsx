import type { ColumnsType } from 'antd/es/table';
import { APPROVAL_BADGE } from '@/common/CommonLabels';
import { Avatar, RatingStars, StatusBadge } from '@/components/ui';
import { formatClock } from '@/lib/utils';
import type { AdminUserRow } from '@/pages/admin/types/admin.models';

/** The users table: what each column shows for a row. */
export const usersColumns: ColumnsType<AdminUserRow> = [
  {
    title: 'Person',
    render: (_, u) => (
      <span className="flex items-center gap-3">
        <Avatar name={u.name ?? u.email} size="sm" />
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-slate-900">{u.name ?? u.email}</span>
          <span className="block text-xs text-slate-500">{u.email}</span>
        </span>
      </span>
    ),
  },
  { title: 'Role', width: 110, render: (_, u) => <span className="text-sm text-slate-700">{u.role === 'provider' ? 'Provider' : 'Customer'}</span> },
  {
    title: 'Status',
    width: 200,
    render: (_, u) => (
      <span className="flex flex-wrap gap-1">
        <StatusBadge label={APPROVAL_BADGE[u.approvalStatus].label} tone={APPROVAL_BADGE[u.approvalStatus].tone} />
        {!u.isActive && <StatusBadge label="Deactivated" tone="error" />}
      </span>
    ),
  },
  { title: 'Jobs', width: 70, render: (_, u) => <span className="text-sm text-slate-800">{u.jobs}</span> },
  {
    title: 'Rating',
    width: 110,
    render: (_, u) =>
      u.ratingCount && u.ratingAverage !== null ? (
        <RatingStars variant="compact" value={u.ratingAverage} count={u.ratingCount} />
      ) : (
        <span className="text-xs text-slate-400">–</span>
      ),
  },
  { title: 'Joined', width: 160, render: (_, u) => <span className="text-xs text-slate-500">{formatClock(u.createdAt)}</span> },
];
