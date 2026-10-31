import { startSessionOnSuccess, toAuthSession } from '../../common/CommonApi';
import type { SessionApiDto } from '../../common/CommonApi';
import type {
  AdminAccount,
  AdminCategory,
  AdminDashboard,
  AdminJobDetail,
  AdminJobRow,
  AdminPaymentRow,
  AdminPayout,
  AdminReviewItem,
  AdminReviewRow,
  AdminUserDetail,
  AdminUserRow,
  AppSettings,
  ApprovalCounts,
  ApprovalItem,
  AuditEntry,
  AuthSession,
  Paged,
  ServiceCheck,
  SystemStatus,
} from '../../common/CommonDto';
import type { ApprovalStatus } from '../../common/CommonEnum';
import { baseApi } from '../../config/base_service/base.api';
import type { SignupCodeSent, VerifySignupDto } from '../auth/types/auth.dto';
import type {
  AccessRequestDto,
  AdminApiDto,
  AdminLoginDto,
  ApprovalItemApiDto,
  AuditEntryApiDto,
  AuditFilters,
  CategoryApiDto,
  CheckApiDto,
  DashboardApiDto,
  JobDetailApiDto,
  JobFilters,
  JobRowApiDto,
  PageApiDto,
  PaymentRowApiDto,
  PayoutApiDto,
  ReviewItemApiDto,
  ReviewRowApiDto,
  SettingsApiDto,
  StatusApiDto,
  UserDetailApiDto,
  UserFilters,
  UserRowApiDto,
} from './types/admin.dto';

const toPage = <A, B>(dto: PageApiDto<A>, map: (item: A) => B): Paged<B> => ({
  items: dto.items.map(map),
  total: dto.total,
  page: dto.page,
  pageSize: dto.page_size,
});

const toUserRow = (dto: UserRowApiDto): AdminUserRow => ({
  id: dto.id,
  role: dto.role,
  name: dto.name,
  email: dto.email,
  phone: dto.phone,
  approvalStatus: dto.approval_status,
  isActive: dto.is_active,
  createdAt: dto.created_at,
  jobs: dto.jobs,
  ratingAverage: dto.rating_average,
  ratingCount: dto.rating_count,
});

const toReviewItem = (dto: ReviewItemApiDto): AdminReviewItem => ({
  id: dto.id,
  jobTitle: dto.job_title,
  author: dto.author,
  stars: dto.stars,
  comment: dto.comment,
  hidden: dto.hidden,
  createdAt: dto.created_at,
});

const toUserDetail = (dto: UserDetailApiDto): AdminUserDetail => ({
  ...toUserRow(dto),
  approvalNote: dto.approval_note,
  approvedAt: dto.approved_at,
  provider: dto.provider && {
    onboardingStatus: dto.provider.onboarding_status,
    skills: dto.provider.skills,
    areaName: dto.provider.area_name,
    pincode: dto.provider.pincode,
    radiusKm: dto.provider.radius_km,
    workDays: dto.provider.work_days,
    bio: dto.provider.bio,
  },
  quotes: dto.quotes,
  jobList: dto.job_list.map((j) => ({
    id: j.id,
    title: j.title,
    status: j.status,
    amount: j.amount_paise === null ? null : j.amount_paise / 100,
    createdAt: j.created_at,
  })),
  reviewsReceived: dto.reviews_received.map(toReviewItem),
  reviewsGiven: dto.reviews_given,
  payments: dto.payments.map((p) => ({
    id: p.id,
    jobTitle: p.job_title,
    status: p.status,
    amount: p.amount_paise / 100,
    payoutStatus: p.payout_status,
    paidAt: p.paid_at,
    createdAt: p.created_at,
  })),
  earned: dto.earned_paise / 100,
  owed: dto.owed_paise / 100,
});

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

const toPaymentRow = (dto: PaymentRowApiDto): AdminPaymentRow => ({
  id: dto.id,
  jobId: dto.job_id,
  jobTitle: dto.job_title,
  customer: dto.customer,
  pro: dto.pro,
  amount: dto.amount_paise / 100,
  status: dto.status,
  method: dto.method,
  lastError: dto.last_error,
  tries: dto.tries,
  failedTries: dto.failed_tries,
  payoutStatus: dto.payout_status,
  createdAt: dto.created_at,
  paidAt: dto.paid_at,
});

const toPayout = (dto: PayoutApiDto): AdminPayout => ({
  paymentId: dto.payment_id,
  jobTitle: dto.job_title,
  providerName: dto.provider_name,
  providerEmail: dto.provider_email,
  providerPhone: dto.provider_phone,
  amount: dto.amount_paise / 100,
  paidAt: dto.paid_at,
  payoutStatus: dto.payout_status,
  payoutReference: dto.payout_reference,
  payoutAt: dto.payout_at,
});

const toReviewRow = (dto: ReviewRowApiDto): AdminReviewRow => ({
  ...toReviewItem(dto),
  jobId: dto.job_id,
  authorRole: dto.author_role,
  subject: dto.subject,
  hiddenReason: dto.hidden_reason,
});

const toCategory = (dto: CategoryApiDto): AdminCategory => ({
  id: dto.id,
  name: dto.name,
  icon: dto.icon,
  sortOrder: dto.sort_order,
  isActive: dto.is_active,
  jobs: dto.jobs,
  skills: dto.skills.map((s) => ({ id: s.id, name: s.name, sortOrder: s.sort_order, isActive: s.is_active, providers: s.providers })),
});

const toCheck = (dto: CheckApiDto): ServiceCheck => ({
  name: dto.name,
  label: dto.label,
  configured: dto.configured,
  ok: dto.ok,
  message: dto.message,
  latencyMs: dto.latency_ms,
  checkedAt: dto.checked_at,
});

const toStatus = (dto: StatusApiDto): SystemStatus => ({
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

const toDashboard = (dto: DashboardApiDto): AdminDashboard => ({
  users: {
    customers: dto.users.customers,
    providers: dto.users.providers,
    admins: dto.users.admins,
    pendingCustomers: dto.users.pending_customers,
    pendingProviders: dto.users.pending_providers,
    signupsToday: dto.users.signups_today,
    signupsWeek: dto.users.signups_week,
  },
  jobs: { byStatus: dto.jobs.by_status, postedToday: dto.jobs.posted_today },
  money: {
    paymentDueCount: dto.money.payment_due_count,
    paymentDueAmount: dto.money.payment_due_paise / 100,
    paidTodayCount: dto.money.paid_today_count,
    paidTodayAmount: dto.money.paid_today_paise / 100,
    failedTriesDay: dto.money.failed_tries_day,
    payoutsWaitingCount: dto.money.payouts_waiting_count,
    payoutsWaitingAmount: dto.money.payouts_waiting_paise / 100,
  },
  reviews: dto.reviews,
  activity: dto.activity.map((a) => ({
    id: a.id,
    type: a.type,
    actor: a.actor,
    jobId: a.job_id,
    jobTitle: a.job_title,
    data: a.data,
    at: a.at,
  })),
});

const toSettings = (dto: SettingsApiDto): AppSettings => ({ groups: dto.groups, canStoreSecrets: dto.can_store_secrets });

const toApproval = (dto: ApprovalItemApiDto): ApprovalItem => ({
  id: dto.id,
  role: dto.role,
  name: dto.name,
  email: dto.email,
  phone: dto.phone,
  approvalStatus: dto.approval_status,
  approvalNote: dto.approval_note,
  createdAt: dto.created_at,
  provider: dto.provider && {
    onboardingStatus: dto.provider.onboarding_status,
    skills: dto.provider.skills,
    areaName: dto.provider.area_name,
    pincode: dto.provider.pincode,
    radiusKm: dto.provider.radius_km,
    workDays: dto.provider.work_days,
    bio: dto.provider.bio,
  },
});

const toCodeSent = (dto: { email: string; resend_in: number; expires_in_minutes: number }): SignupCodeSent => ({
  email: dto.email,
  resendIn: dto.resend_in,
  expiresInMinutes: dto.expires_in_minutes,
});

const toAdmin = (dto: AdminApiDto): AdminAccount => ({
  id: dto.id,
  name: dto.name,
  email: dto.email,
  phone: dto.phone,
  approvalStatus: dto.approval_status,
  approvalNote: dto.approval_note,
  isActive: dto.is_active,
  isOwner: dto.is_owner,
  createdAt: dto.created_at,
  approvedAt: dto.approved_at,
});

const toAuditEntry = (dto: AuditEntryApiDto): AuditEntry => ({
  id: dto.id,
  action: dto.action,
  summary: dto.summary,
  actor: dto.actor,
  targetType: dto.target_type,
  targetId: dto.target_id,
  details: dto.details,
  ip: dto.ip,
  createdAt: dto.created_at,
});

/** Admin console: log-in with an emailed code, access requests, admins (owner) and the audit log. */
export const adminApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** Step 1: email and password; a code goes to the admin's email */
    adminLogin: builder.mutation<SignupCodeSent, AdminLoginDto>({
      query: (body) => ({ url: '/admin/auth/login', method: 'POST', body }),
      transformResponse: toCodeSent,
    }),
    /** Step 2: the code opens the admin session */
    adminVerify: builder.mutation<AuthSession, VerifySignupDto>({
      query: (body) => ({ url: '/admin/auth/verify', method: 'POST', body }),
      transformResponse: (dto: SessionApiDto) => toAuthSession(dto),
      onQueryStarted: startSessionOnSuccess,
    }),
    requestAdminAccess: builder.mutation<SignupCodeSent, AccessRequestDto>({
      query: (body) => ({ url: '/admin/auth/request-access', method: 'POST', body }),
      transformResponse: toCodeSent,
    }),
    /** The code creates the request; the owner's own address is approved at once */
    verifyAdminAccess: builder.mutation<{ email: string; approvalStatus: ApprovalStatus }, VerifySignupDto>({
      query: (body) => ({ url: '/admin/auth/request-access/verify', method: 'POST', body }),
      transformResponse: (dto: { email: string; approval_status: ApprovalStatus }) => ({
        email: dto.email,
        approvalStatus: dto.approval_status,
      }),
    }),

    // ----- Admins (the owner only) -----
    getAdmins: builder.query<AdminAccount[], void>({
      query: () => '/admin/admins',
      transformResponse: (dto: AdminApiDto[]) => dto.map(toAdmin),
      providesTags: ['Admins'],
    }),
    approveAdmin: builder.mutation<AdminAccount, string>({
      query: (id) => ({ url: `/admin/admins/${id}/approve`, method: 'POST' }),
      transformResponse: toAdmin,
      invalidatesTags: ['Admins', 'Audit'],
    }),
    rejectAdmin: builder.mutation<AdminAccount, { id: string; reason: string }>({
      query: ({ id, reason }) => ({ url: `/admin/admins/${id}/reject`, method: 'POST', body: { reason } }),
      transformResponse: toAdmin,
      invalidatesTags: ['Admins', 'Audit'],
    }),
    setAdminActive: builder.mutation<AdminAccount, { id: string; active: boolean; reason?: string }>({
      query: ({ id, active, reason }) => ({
        url: `/admin/admins/${id}/${active ? 'activate' : 'deactivate'}`,
        method: 'POST',
        ...(!active && { body: { reason: reason || null } }),
      }),
      transformResponse: toAdmin,
      invalidatesTags: ['Admins', 'Audit'],
    }),

    // ----- Approvals: customers and providers waiting for an admin -----
    getApprovals: builder.query<ApprovalItem[], 'customer' | 'provider' | undefined>({
      query: (role) => ({ url: '/admin/approvals', params: role ? { role } : {} }),
      transformResponse: (dto: ApprovalItemApiDto[]) => dto.map(toApproval),
      providesTags: ['Approvals'],
    }),
    /** The console's badges */
    getApprovalCounts: builder.query<ApprovalCounts, void>({
      query: () => '/admin/approvals/count',
      providesTags: ['Approvals', 'Admins'],
    }),
    approveUser: builder.mutation<ApprovalItem, string>({
      query: (id) => ({ url: `/admin/users/${id}/approve`, method: 'POST', body: {} }),
      transformResponse: toApproval,
      invalidatesTags: ['Approvals', 'Audit'],
    }),
    rejectUser: builder.mutation<ApprovalItem, { id: string; reason: string }>({
      query: ({ id, reason }) => ({ url: `/admin/users/${id}/reject`, method: 'POST', body: { reason } }),
      transformResponse: toApproval,
      invalidatesTags: ['Approvals', 'Audit'],
    }),

    // ----- Dashboard and status -----
    getAdminDashboard: builder.query<AdminDashboard, void>({
      query: () => '/admin/dashboard',
      transformResponse: toDashboard,
      providesTags: ['Status'],
    }),
    getSystemStatus: builder.query<SystemStatus, void>({
      query: () => '/admin/status',
      transformResponse: toStatus,
      providesTags: ['Status'],
    }),

    // ----- Settings (the owner) -----
    getAppSettings: builder.query<AppSettings, void>({
      query: () => '/admin/settings',
      transformResponse: toSettings,
      providesTags: ['Settings'],
    }),
    /** `null` goes back to the .env value */
    updateAppSettings: builder.mutation<AppSettings, Record<string, string | null>>({
      query: (changes) => ({ url: '/admin/settings', method: 'PUT', body: { changes } }),
      transformResponse: toSettings,
      invalidatesTags: ['Settings', 'Status', 'Audit'],
    }),
    testAppSettings: builder.mutation<ServiceCheck, string>({
      query: (group) => ({ url: `/admin/settings/${group}/test`, method: 'POST' }),
      transformResponse: toCheck,
      invalidatesTags: ['Status'],
    }),

    // ----- Customers and providers -----
    getAdminUsers: builder.query<Paged<AdminUserRow>, UserFilters>({
      query: (f) => ({
        url: '/admin/users',
        params: {
          page: f.page,
          page_size: f.pageSize,
          ...(f.role && { role: f.role }),
          ...(f.approval && { approval: f.approval }),
          ...(f.active !== undefined && { active: f.active }),
          ...(f.q && { q: f.q }),
        },
      }),
      transformResponse: (dto: PageApiDto<UserRowApiDto>) => toPage(dto, toUserRow),
      providesTags: ['AdminUsers'],
    }),
    getAdminUser: builder.query<AdminUserDetail, string>({
      query: (id) => `/admin/users/${id}`,
      transformResponse: toUserDetail,
      providesTags: ['AdminUsers'],
    }),
    setUserActive: builder.mutation<AdminUserDetail, { id: string; active: boolean; reason?: string }>({
      query: ({ id, active, reason }) => ({
        url: `/admin/users/${id}/${active ? 'activate' : 'deactivate'}`,
        method: 'POST',
        ...(!active && { body: { reason: reason || null } }),
      }),
      transformResponse: toUserDetail,
      invalidatesTags: ['AdminUsers', 'Audit'],
    }),
    signOutUser: builder.mutation<AdminUserDetail, string>({
      query: (id) => ({ url: `/admin/users/${id}/sign-out`, method: 'POST' }),
      transformResponse: toUserDetail,
      invalidatesTags: ['AdminUsers', 'Audit'],
    }),

    // ----- Jobs -----
    getAdminJobs: builder.query<Paged<AdminJobRow>, JobFilters>({
      query: (f) => ({
        url: '/admin/jobs',
        params: { page: f.page, page_size: f.pageSize, ...(f.status && { status: f.status }), ...(f.q && { q: f.q }) },
      }),
      transformResponse: (dto: PageApiDto<JobRowApiDto>) => toPage(dto, toJobRow),
      providesTags: ['AdminJobs'],
    }),
    getAdminJob: builder.query<AdminJobDetail, string>({
      query: (id) => `/admin/jobs/${id}`,
      transformResponse: toJobDetail,
      providesTags: ['AdminJobs'],
    }),
    /** Reading the chat is recorded in the audit log, so it's a mutation */
    readJobChat: builder.mutation<{ id: string; sender: string; body: string; at: string }[], string>({
      query: (id) => ({ url: `/admin/jobs/${id}/messages`, method: 'GET' }),
      invalidatesTags: ['Audit'],
    }),
    cancelAdminJob: builder.mutation<AdminJobDetail, { id: string; reason: string }>({
      query: ({ id, reason }) => ({ url: `/admin/jobs/${id}/cancel`, method: 'POST', body: { reason } }),
      transformResponse: toJobDetail,
      invalidatesTags: ['AdminJobs', 'Audit', 'Status'],
    }),

    // ----- Payments and payouts -----
    getAdminPayments: builder.query<Paged<AdminPaymentRow>, { page: number; pageSize: number; status?: string }>({
      query: (f) => ({ url: '/admin/payments', params: { page: f.page, page_size: f.pageSize, ...(f.status && { status: f.status }) } }),
      transformResponse: (dto: PageApiDto<PaymentRowApiDto>) => toPage(dto, toPaymentRow),
      providesTags: ['AdminPayments'],
    }),
    recheckPayment: builder.mutation<AdminPaymentRow, string>({
      query: (id) => ({ url: `/admin/payments/${id}/recheck`, method: 'POST' }),
      transformResponse: toPaymentRow,
      invalidatesTags: ['AdminPayments', 'Audit', 'Status'],
    }),
    getPayouts: builder.query<AdminPayout[], 'pending' | 'paid'>({
      query: (status) => ({ url: '/admin/payouts', params: { status } }),
      transformResponse: (dto: PayoutApiDto[]) => dto.map(toPayout),
      providesTags: ['AdminPayments'],
    }),
    markPayoutSent: builder.mutation<AdminPayout, { paymentId: string; reference: string }>({
      query: ({ paymentId, reference }) => ({ url: `/admin/payouts/${paymentId}/paid`, method: 'POST', body: { reference } }),
      transformResponse: toPayout,
      invalidatesTags: ['AdminPayments', 'Audit', 'Status'],
    }),

    // ----- Reviews -----
    getAdminReviews: builder.query<Paged<AdminReviewRow>, { page: number; pageSize: number; hidden?: boolean; stars?: number }>({
      query: (f) => ({
        url: '/admin/reviews',
        params: { page: f.page, page_size: f.pageSize, ...(f.hidden !== undefined && { hidden: f.hidden }), ...(f.stars && { stars: f.stars }) },
      }),
      transformResponse: (dto: PageApiDto<ReviewRowApiDto>) => toPage(dto, toReviewRow),
      providesTags: ['AdminReviews'],
    }),
    setReviewHidden: builder.mutation<AdminReviewRow, { id: string; hidden: boolean; reason?: string }>({
      query: ({ id, hidden, reason }) => ({
        url: `/admin/reviews/${id}/${hidden ? 'hide' : 'unhide'}`,
        method: 'POST',
        ...(hidden && { body: { reason } }),
      }),
      transformResponse: toReviewRow,
      invalidatesTags: ['AdminReviews', 'Audit', 'Providers', 'Reviews'],
    }),

    // ----- Catalog -----
    getAdminCatalog: builder.query<AdminCategory[], void>({
      query: () => '/admin/catalog',
      transformResponse: (dto: CategoryApiDto[]) => dto.map(toCategory),
      providesTags: ['AdminCatalog'],
    }),
    saveCategory: builder.mutation<AdminCategory[], { id?: string; name: string; icon: string; sortOrder: number; isActive: boolean }>({
      query: ({ id, name, icon, sortOrder, isActive }) => ({
        url: id ? `/admin/catalog/categories/${id}` : '/admin/catalog/categories',
        method: id ? 'PUT' : 'POST',
        body: { name, icon, sort_order: sortOrder, is_active: isActive },
      }),
      transformResponse: (dto: CategoryApiDto[]) => dto.map(toCategory),
      invalidatesTags: ['AdminCatalog', 'Catalog', 'Audit'],
    }),
    saveSkill: builder.mutation<AdminCategory[], { categoryId: string; id?: string; name: string; sortOrder: number; isActive: boolean }>({
      query: ({ categoryId, id, name, sortOrder, isActive }) => ({
        url: id ? `/admin/catalog/categories/${categoryId}/skills/${id}` : `/admin/catalog/categories/${categoryId}/skills`,
        method: id ? 'PUT' : 'POST',
        body: { name, sort_order: sortOrder, is_active: isActive },
      }),
      transformResponse: (dto: CategoryApiDto[]) => dto.map(toCategory),
      invalidatesTags: ['AdminCatalog', 'Catalog', 'Audit'],
    }),

    // ----- Audit log -----
    getAuditLog: builder.query<Paged<AuditEntry>, AuditFilters>({
      query: (f) => ({ url: '/admin/audit', params: { page: f.page, page_size: f.pageSize, ...(f.action && { action: f.action }) } }),
      transformResponse: (dto: PageApiDto<AuditEntryApiDto>) => ({
        items: dto.items.map(toAuditEntry),
        total: dto.total,
        page: dto.page,
        pageSize: dto.page_size,
      }),
      providesTags: ['Audit'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useAdminLoginMutation,
  useAdminVerifyMutation,
  useRequestAdminAccessMutation,
  useVerifyAdminAccessMutation,
  useGetAdminsQuery,
  useApproveAdminMutation,
  useRejectAdminMutation,
  useSetAdminActiveMutation,
  useGetAuditLogQuery,
  useGetAdminDashboardQuery,
  useGetSystemStatusQuery,
  useGetAppSettingsQuery,
  useUpdateAppSettingsMutation,
  useTestAppSettingsMutation,
  useGetAdminUsersQuery,
  useGetAdminUserQuery,
  useSetUserActiveMutation,
  useSignOutUserMutation,
  useGetAdminJobsQuery,
  useGetAdminJobQuery,
  useReadJobChatMutation,
  useCancelAdminJobMutation,
  useGetAdminPaymentsQuery,
  useRecheckPaymentMutation,
  useGetPayoutsQuery,
  useMarkPayoutSentMutation,
  useGetAdminReviewsQuery,
  useSetReviewHiddenMutation,
  useGetAdminCatalogQuery,
  useSaveCategoryMutation,
  useSaveSkillMutation,
  useGetApprovalsQuery,
  useGetApprovalCountsQuery,
  useApproveUserMutation,
  useRejectUserMutation,
} = adminApi;
