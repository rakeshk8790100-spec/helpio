import { Segmented, Select, Table } from 'antd';
import ReasonDialog from '@/clients/default/admin/shared/reasonDialog';
import { PageHeader } from '@/components/admin';
import { AlertBanner } from '@/components/ui';
import type { ReviewsAdminLayoutProps } from '@/pages/admin/screens/reviews/types/reviews.dto';
import type { AdminReviewRow } from '@/pages/admin/types/admin.models';

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
        columns={p.columns}
      />
    )}
    {p.dialog && <ReasonDialog {...p.dialog} />}
  </div>
);

export default ReviewsAdminLayout;
