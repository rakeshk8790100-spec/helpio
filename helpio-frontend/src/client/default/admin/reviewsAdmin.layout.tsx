import { Button, Segmented, Select, Table } from 'antd';
import type { AdminReviewRow } from '../../../common/CommonDto';
import { PageHeader } from '../../../component/admin';
import { AlertBanner, RatingStars, StatusBadge } from '../../../component/ui';
import { formatClock } from '../../../lib/utils';
import type { ReviewsAdminLayoutProps } from './admin.layout.types';
import ReasonDialog from './reasonDialog';

/** /admin/reviews: every review; hide abusive ones (kept for the record, left out of ratings and profiles). */
const ReviewsAdminLayout = (p: ReviewsAdminLayoutProps) => (
  <div>
    <PageHeader
      title="Reviews"
      description="Hide reviews that are abusive or share contact details. Hidden reviews are kept but don't count anywhere."
      actions={
        <>
          <Select
            allowClear
            placeholder="Any rating"
            value={p.stars.value}
            onChange={(value) => p.stars.onChange(value ?? null)}
            options={[1, 2, 3, 4, 5].map((value) => ({ value, label: `${value} star${value === 1 ? '' : 's'}` }))}
            className="w-36"
            aria-label="Rating"
          />
          <Segmented
            value={p.visibility.value}
            onChange={p.visibility.onChange}
            options={[
              { value: 'all', label: 'All' },
              { value: 'visible', label: 'Visible' },
              { value: 'hidden', label: 'Hidden' },
            ]}
          />
        </>
      }
    />
    {p.list.status === 'error' ? (
      <AlertBanner message={p.list.message} onRetry={p.list.onRetry} />
    ) : (
      <Table<AdminReviewRow>
        rowKey="id"
        loading={p.list.status === 'loading' || p.list.fetching}
        dataSource={p.list.status === 'ready' ? p.list.rows : []}
        className="rounded-2xl border border-slate-100 bg-white shadow-sm"
        pagination={
          p.list.status === 'ready' && {
            current: p.list.page,
            pageSize: p.list.pageSize,
            total: p.list.total,
            showSizeChanger: false,
            onChange: p.list.onPageChange,
          }
        }
        columns={[
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
              p.list.status === 'ready' && (
                <span className="flex items-center justify-end gap-2">
                  {r.hidden && <StatusBadge label="Hidden" tone="neutral" />}
                  {r.hidden ? (
                    <Button size="small" loading={p.list.busyId === r.id} onClick={() => p.list.status === 'ready' && p.list.onShow(r)}>
                      Show
                    </Button>
                  ) : (
                    <Button size="small" danger disabled={p.list.busyId === r.id} onClick={() => p.list.status === 'ready' && p.list.onHide(r)}>
                      Hide
                    </Button>
                  )}
                </span>
              ),
          },
        ]}
      />
    )}
    {p.dialog && <ReasonDialog {...p.dialog} />}
  </div>
);

export default ReviewsAdminLayout;
