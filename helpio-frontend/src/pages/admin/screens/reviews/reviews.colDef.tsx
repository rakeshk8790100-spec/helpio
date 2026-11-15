import { Button } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { RatingStars, StatusBadge } from '@/components/ui';
import { formatClock } from '@/lib/utils';
import type { AdminReviewRow } from '@/pages/admin/types/admin.models';

/** Reviews table; once loaded, each review can be hidden (with a reason) or shown again. */
export const reviewColumns = (
  actions: { busyId: string | null; onHide: (review: AdminReviewRow) => void; onShow: (review: AdminReviewRow) => void } | null,
): ColumnsType<AdminReviewRow> => [
  { title: 'Rating', width: 120, render: (_, r) => <RatingStars value={r.stars} /> },
  {
    title: 'Review',
    render: (_, r) => (
      <span>
        <span className="block text-sm text-slate-800">{r.comment ?? <span className="text-slate-400">No comment</span>}</span>
        {r.hidden && r.hiddenReason && <span className="block text-xs text-slate-500">Hidden: {r.hiddenReason}</span>}
      </span>
    ),
  },
  {
    title: 'Who',
    width: 240,
    render: (_, r) => (
      <span className="text-xs text-slate-600">
        {r.author} ({r.authorRole === 'customer' ? 'customer' : 'pro'}) about {r.subject}
        <span className="block text-slate-500">{r.jobTitle}</span>
      </span>
    ),
  },
  { title: 'When', width: 150, render: (_, r) => <span className="text-xs text-slate-500">{formatClock(r.createdAt)}</span> },
  {
    title: '',
    width: 160,
    align: 'right',
    render: (_, r) =>
      actions && (
        <span className="flex items-center justify-end gap-2">
          {r.hidden && <StatusBadge label="Hidden" tone="neutral" />}
          {r.hidden ? (
            <Button size="small" loading={actions.busyId === r.id} onClick={() => actions.onShow(r)}>
              Show
            </Button>
          ) : (
            <Button size="small" danger disabled={actions.busyId === r.id} onClick={() => actions.onHide(r)}>
              Hide
            </Button>
          )}
        </span>
      ),
  },
];
