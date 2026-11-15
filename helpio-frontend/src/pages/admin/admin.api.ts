import { baseApi } from '@/config/base_service/base.api';
import { APIS } from '@/config/base_service/http.config';
import type { SignupCodeSent } from '@/pages/auth/types/auth.dto';
import type { PageApiDto, ReviewItemApiDto, StatusApiDto, CheckApiDto } from './types/admin.dto';
import type { AdminReviewItem, ApprovalCounts, Paged, SystemStatus, ServiceCheck } from './types/admin.models';

export const toPage = <A, B>(dto: PageApiDto<A>, map: (item: A) => B): Paged<B> => ({
  items: dto.items.map(map),
  total: dto.total,
  page: dto.page,
  pageSize: dto.page_size,
});

export const toReviewItem = (dto: ReviewItemApiDto): AdminReviewItem => ({
  id: dto.id,
  jobTitle: dto.job_title,
  author: dto.author,
  stars: dto.stars,
  comment: dto.comment,
  hidden: dto.hidden,
  createdAt: dto.created_at,
});

export const toCheck = (dto: CheckApiDto): ServiceCheck => ({
  name: dto.name,
  label: dto.label,
  configured: dto.configured,
  ok: dto.ok,
  message: dto.message,
  latencyMs: dto.latency_ms,
  checkedAt: dto.checked_at,
});

export const toStatus = (dto: StatusApiDto): SystemStatus => ({
  env: dto.env,
  version: dto.version,
  startedAt: dto.started_at,
  database: toCheck(dto.database),
  integrations: dto.integrations.map(toCheck),
  heartbeats: dto.heartbeats.map((h) => ({
    name: h.name,
    label: h.label,
    description: h.description,
    lastOkAt: h.last_ok_at,
    lastErrorAt: h.last_error_at,
    lastError: h.last_error,
    healthy: h.healthy,
  })),
  email: {
    sent: dto.email.sent,
    failed: dto.email.failed,
    lastOkAt: dto.email.last_ok_at,
    lastErrorAt: dto.email.last_error_at,
    lastError: dto.email.last_error,
  },
  errors: dto.errors.map((e) => ({
    id: e.id,
    method: e.method,
    path: e.path,
    errorType: e.error_type,
    message: e.message,
    count: e.count,
    lastSeen: e.last_seen,
  })),
  attention: {
    approvalsWaiting: dto.attention.approvals_waiting,
    paymentsStuck: dto.attention.payments_stuck,
    payoutsWaiting: dto.attention.payouts_waiting,
    payoutsWaitingAmount: dto.attention.payouts_waiting_paise / 100,
  },
});

export const toCodeSent = (dto: { email: string; resend_in: number; expires_in_minutes: number }): SignupCodeSent => ({
  email: dto.email,
  resendIn: dto.resend_in,
  expiresInMinutes: dto.expires_in_minutes,
});

/** Admin console: log-in with an emailed code, access requests, admins (owner) and the audit log. */
export const adminApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({

    // ----- Admins (the owner only) -----

    // ----- Approvals: customers and providers waiting for an admin -----
    /** The console's badges */
    getApprovalCounts: builder.query<ApprovalCounts, void>({
      query: () => APIS.ADMIN.APPROVALS_COUNT,
      providesTags: ['Approvals', 'Admins'],
    }),

    // ----- Dashboard and status -----
    getSystemStatus: builder.query<SystemStatus, void>({
      query: () => APIS.ADMIN.STATUS,
      transformResponse: toStatus,
      providesTags: ['Status'],
    }),

    // ----- Settings (the owner) -----

    // ----- Customers and providers -----

    // ----- Jobs -----

    // ----- Payments and payouts -----

    // ----- Reviews -----

    // ----- Catalog -----

    // ----- Audit log -----
  }),
  overrideExisting: false,
});

export const {
  useGetSystemStatusQuery,
  useGetApprovalCountsQuery,
} = adminApi;
