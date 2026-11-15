import type { ColumnsType } from 'antd/es/table';
import type { WithStatus } from '@/common/CommonDto';
import type { AdminReviewRow, PagedList, ReasonDialogProps } from '@/pages/admin/types/admin.models';

/* The reviews admin screen: its layout's props. */

export interface ReviewsAdminProps {
  visibility: { value: 'all' | 'visible' | 'hidden'; onChange: (value: 'all' | 'visible' | 'hidden') => void };
  stars: { value: number | null; onChange: (value: number | null) => void };
  list: WithStatus<PagedList<AdminReviewRow> & { busyId: string | null; onHide: (review: AdminReviewRow) => void; onShow: (review: AdminReviewRow) => void }>;
  dialog: ReasonDialogProps | null;
}

/** The layout gets the page's props and the table's columns (from reviews.colDef) */
export type ReviewsAdminLayoutProps = ReviewsAdminProps & { columns: ColumnsType<AdminReviewRow> };
