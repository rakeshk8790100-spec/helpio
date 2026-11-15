import { baseApi } from '@/config/base_service/base.api';
import { APIS } from '@/config/base_service/http.config';
import { replaceUrlPlaceholders } from '@/lib/utils';
import { toPage, toReviewItem } from '@/pages/admin/admin.api';
import type { JobDetailApiDto, JobFilters, JobRowApiDto, PageApiDto } from '@/pages/admin/types/admin.dto';
import type { AdminJobDetail, AdminJobRow, Paged } from '@/pages/admin/types/admin.models';

const toJobRow = (dto: JobRowApiDto): AdminJobRow => ({
  id: dto.id,
  title: dto.title,
  status: dto.status,
  category: dto.category,
  area: dto.area,
  customer: dto.customer,
  pro: dto.pro,
  amount: dto.amount_paise === null ? null : dto.amount_paise / 100,
  progressPct: dto.progress_pct,
  createdAt: dto.created_at,
  updatedAt: dto.updated_at,
});

const toJobDetail = (dto: JobDetailApiDto): AdminJobDetail => ({
  ...toJobRow(dto),
  description: dto.description,
  pincode: dto.pincode,
  coordinates: dto.latitude !== null && dto.longitude !== null ? { latitude: dto.latitude, longitude: dto.longitude } : null,
  budget: dto.budget_paise === null ? null : dto.budget_paise / 100,
  scheduledAt: dto.scheduled_at,
  isEmergency: dto.is_emergency,
  startedAt: dto.started_at,
  customerParty: dto.customer_party,
  proParty: dto.pro_party,
  quotes: dto.quotes.map((q) => ({ pro: q.pro, amount: q.amount_paise / 100, status: q.status, message: q.message, createdAt: q.created_at })),
  stages: dto.stages.map((s) => ({
    stage: s.stage,
    percent: s.percent,
    status: s.status,
    attempts: s.attempts.map((a) => ({
      note: a.note,
      reviewStatus: a.review_status,
      reviewNote: a.review_note,
      submittedAt: a.submitted_at,
      photos: a.photos,
    })),
  })),
  events: dto.events,
  payments: dto.payments.map((p) => ({
    id: p.id,
    status: p.status,
    amount: p.amount_paise / 100,
    lastError: p.last_error,
    tries: p.tries,
    paidAt: p.paid_at,
    payoutStatus: p.payout_status,
    payoutReference: p.payout_reference,
  })),
  reviews: dto.reviews.map(toReviewItem),
  canCancel: dto.can_cancel,
});

/** Endpoints only this admin screen uses. */
export const jobsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminJobs: builder.query<Paged<AdminJobRow>, JobFilters>({
      query: (f) => ({
        url: APIS.ADMIN.JOBS,
        params: { page: f.page, page_size: f.pageSize, ...(f.status && { status: f.status }), ...(f.q && { q: f.q }) },
      }),
      transformResponse: (dto: PageApiDto<JobRowApiDto>) => toPage(dto, toJobRow),
      providesTags: ['AdminJobs'],
    }),
    getAdminJob: builder.query<AdminJobDetail, string>({
      query: (id) => replaceUrlPlaceholders(APIS.ADMIN.JOB, { id }),
      transformResponse: toJobDetail,
      providesTags: ['AdminJobs'],
    }),
    /** Reading the chat is recorded in the audit log, so it's a mutation */
    readJobChat: builder.mutation<{ id: string; sender: string; body: string; at: string }[], string>({
      query: (id) => ({ url: replaceUrlPlaceholders(APIS.ADMIN.JOB_MESSAGES, { id }), method: 'GET' }),
      invalidatesTags: ['Audit'],
    }),
    cancelAdminJob: builder.mutation<AdminJobDetail, { id: string; reason: string }>({
      query: ({ id, reason }) => ({ url: replaceUrlPlaceholders(APIS.ADMIN.JOB_CANCEL, { id }), method: 'POST', body: { reason } }),
      transformResponse: toJobDetail,
      invalidatesTags: ['AdminJobs', 'Audit', 'Status'],
    }),
  }),
  overrideExisting: false,
});

export const { useGetAdminJobsQuery, useGetAdminJobQuery, useReadJobChatMutation, useCancelAdminJobMutation } = jobsApi;
