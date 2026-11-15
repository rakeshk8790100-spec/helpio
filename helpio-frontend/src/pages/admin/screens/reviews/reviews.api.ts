import { baseApi } from '@/config/base_service/base.api';
import { APIS } from '@/config/base_service/http.config';
import { replaceUrlPlaceholders } from '@/lib/utils';
import { toPage, toReviewItem } from '@/pages/admin/admin.api';
import type { PageApiDto, ReviewRowApiDto } from '@/pages/admin/types/admin.dto';
import type { AdminReviewRow, Paged } from '@/pages/admin/types/admin.models';

const toReviewRow = (dto: ReviewRowApiDto): AdminReviewRow => ({
  ...toReviewItem(dto),
  jobId: dto.job_id,
  authorRole: dto.author_role,
  subject: dto.subject,
  hiddenReason: dto.hidden_reason,
});

/** Endpoints only this admin screen uses. */
export const reviewsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminReviews: builder.query<Paged<AdminReviewRow>, { page: number; pageSize: number; hidden?: boolean; stars?: number }>({
      query: (f) => ({
        url: APIS.ADMIN.REVIEWS,
        params: { page: f.page, page_size: f.pageSize, ...(f.hidden !== undefined && { hidden: f.hidden }), ...(f.stars && { stars: f.stars }) },
      }),
      transformResponse: (dto: PageApiDto<ReviewRowApiDto>) => toPage(dto, toReviewRow),
      providesTags: ['AdminReviews'],
    }),
    setReviewHidden: builder.mutation<AdminReviewRow, { id: string; hidden: boolean; reason?: string }>({
      query: ({ id, hidden, reason }) => ({
        url: replaceUrlPlaceholders(APIS.ADMIN.REVIEW_VISIBILITY, { id, action: hidden ? 'hide' : 'unhide' }),
        method: 'POST',
        ...(hidden && { body: { reason } }),
      }),
      transformResponse: toReviewRow,
      invalidatesTags: ['AdminReviews', 'Audit', 'Providers', 'Reviews'],
    }),
  }),
  overrideExisting: false,
});

export const { useGetAdminReviewsQuery, useSetReviewHiddenMutation } = reviewsApi;
