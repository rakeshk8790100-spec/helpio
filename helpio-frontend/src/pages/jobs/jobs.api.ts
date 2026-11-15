import { toJob, toJobQuote } from '@/common/CommonApi';
import type { JobApiDto } from '@/common/CommonApi';
import type { Job, JobAttachment, JobDetail, JobPayment, JobProgress, JobReview, JobReviews } from '@/common/CommonDto';
import { baseApi, list, one } from '@/config/base_service/base.api';
import { APIS } from '@/config/base_service/http.config';
import { replaceUrlPlaceholders } from '@/lib/utils';
import type { AttachmentApiDto, JobDetailApiDto, JobPaymentApiDto, JobReviewApiDto, JobReviewsApiDto, MilestonesApiDto, PaymentReturn } from './types/jobs.dto';

export const toJobDetail = (dto: JobDetailApiDto): JobDetail => ({
  ...toJob(dto),
  attachments: dto.attachments.map(toAttachment),
  quotes: dto.quotes.map((q) => ({
    ...toJobQuote(q),
    providerId: q.provider_id,
    providerLabel: q.provider_label,
    avatarUrl: q.avatar_url,
    proficiency: q.proficiency,
    yearsExperience: q.years_experience,
    approxDistanceKm: q.approx_distance_km,
  })),
  invites: dto.invites.map((i) => ({
    providerId: i.provider_id,
    providerLabel: i.provider_label,
    avatarUrl: i.avatar_url,
    status: i.status,
  })),
  hired: dto.hired && {
    providerId: dto.hired.provider_id,
    providerLabel: dto.hired.provider_label,
    avatarUrl: dto.hired.avatar_url,
    amount: dto.hired.amount_paise / 100,
  },
  startPin: dto.start_pin,
  pinLocked: dto.pin_locked,
  startedAt: dto.started_at,
  unreadMessages: dto.unread_messages,
});

export const toAttachment = (dto: AttachmentApiDto): JobAttachment => ({ id: dto.id, contentType: dto.content_type, url: dto.url });

const toJobProgress = (dto: MilestonesApiDto): JobProgress => ({
  jobId: dto.job_id,
  jobTitle: dto.job_title,
  jobStatus: dto.job_status,
  progressPct: dto.progress_pct,
  amount: dto.amount_paise / 100,
  earned: dto.earned_paise / 100,
  currentStage: dto.current_stage,
  estimatedMins: dto.estimated_mins,
  startedAt: dto.started_at,
  extraMinsTotal: dto.extra_mins_total,
  milestones: dto.milestones.map((m) => ({
    stage: m.stage,
    percent: m.percent,
    status: m.status,
    amount: m.amount_paise / 100,
    approvedAt: m.approved_at,
    dueAt: m.due_at,
    extraMins: m.extra_mins,
    submissions: m.submissions.map((s) => ({
      id: s.id,
      note: s.note,
      photos: s.photos.map(toAttachment),
      submittedAt: s.submitted_at,
      reviewStatus: s.review_status,
      reviewNote: s.review_note,
      reviewedAt: s.reviewed_at,
    })),
  })),
  events: dto.events.map((e) => ({
    id: e.id,
    type: e.type,
    actorLabel: e.actor_label,
    stage: e.data.stage ?? null,
    reason: e.data.reason ?? null,
    amount: e.data.amount_paise !== undefined ? e.data.amount_paise / 100 : null,
    rating: e.data.rating ?? null,
    createdAt: e.created_at,
  })),
});

const toJobPayment = (dto: JobPaymentApiDto): JobPayment => ({
  jobId: dto.job_id,
  jobStatus: dto.job_status,
  amount: dto.amount_paise / 100,
  paymentId: dto.payment_id,
  status: dto.status,
  lastError: dto.last_error,
  expiresAt: dto.expires_at,
  paidAt: dto.paid_at,
  method: dto.method,
  attempts: dto.attempts.map((a) => ({
    id: a.id,
    status: a.status,
    method: a.method,
    amount: a.amount_paise / 100,
    errorDescription: a.error_description,
    attemptedAt: a.attempted_at,
  })),
  payout: dto.payout && { status: dto.payout.status, reference: dto.payout.reference, sentAt: dto.payout.sent_at },
  canPay: dto.can_pay,
});

const toReview = (dto: JobReviewApiDto): JobReview => ({
  id: dto.id,
  rating: dto.rating,
  comment: dto.comment,
  reviewerLabel: dto.reviewer_label,
  reviewerRole: dto.reviewer_role,
  createdAt: dto.created_at,
});

const toJobReviews = (dto: JobReviewsApiDto): JobReviews => ({
  canReview: dto.can_review,
  mine: dto.mine && toReview(dto.mine),
  theirs: dto.theirs && toReview(dto.theirs),
});

/** Job endpoints used by more than one screen: the job, progress, payment and reviews. */
export const jobsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ----- Customer -----
    getMyJobs: builder.query<Job[], void>({
      query: () => APIS.JOBS.MINE,
      transformResponse: (dto: JobApiDto[]) => dto.map(toJob),
      providesTags: [list('Jobs')],
    }),
    getJob: builder.query<JobDetail, string>({
      query: (id) => replaceUrlPlaceholders(APIS.JOBS.DETAIL, { id }),
      transformResponse: toJobDetail,
      providesTags: (_r, _e, id) => [one('Jobs', id)],
    }),
    /** Drafts only; posted jobs can't be deleted */
    deleteJob: builder.mutation<void, string>({
      query: (id) => ({ url: replaceUrlPlaceholders(APIS.JOBS.DETAIL, { id }), method: 'DELETE' }),
      invalidatesTags: (_r, _e, id) => [one('Jobs', id), list('Jobs')],
    }),

    /** Send an open job straight to a chosen pro */
    inviteProvider: builder.mutation<void, { jobId: string; providerId: string; message: string | null }>({
      query: ({ jobId, providerId, message }) => ({
        url: replaceUrlPlaceholders(APIS.JOBS.INVITES, { jobId }),
        method: 'POST',
        body: { provider_id: providerId, message },
      }),
      transformResponse: () => undefined,
      invalidatesTags: (_r, _e, { jobId }) => [one('Jobs', jobId), list('Jobs')],
    }),


    // ----- Progress: four 25% stages (customer and hired pro) -----
    getJobProgress: builder.query<JobProgress, string>({
      query: (jobId) => replaceUrlPlaceholders(APIS.JOBS.MILESTONES, { jobId }),
      transformResponse: toJobProgress,
      providesTags: (_r, _e, jobId) => [one('Milestones', jobId)],
    }),
    /** Hired pro: photos and a note for the open stage, sent to the customer for approval */
    submitMilestone: builder.mutation<JobProgress, { jobId: string; stage: number; note: string; files: File[] }>({
      query: ({ jobId, stage, note, files }) => {
        const body = new FormData();
        body.append('note', note);
        files.forEach((file) => body.append('files', file));
        // 60s: several photos on a slow connection take longer than the default timeout
        return { url: replaceUrlPlaceholders(APIS.JOBS.MILESTONE_SUBMIT, { jobId, stage }), method: 'POST', body, timeout: 60_000 };
      },
      transformResponse: toJobProgress,
      invalidatesTags: (_r, _e, { jobId }) => [one('Milestones', jobId), one('Jobs', jobId), list('Jobs'), 'Notifications'],
    }),
    /** Jobs started before estimates existed: the pro sets it once */
    setJobEstimate: builder.mutation<JobProgress, { jobId: string; estimatedMins: number }>({
      query: ({ jobId, estimatedMins }) => ({ url: replaceUrlPlaceholders(APIS.JOBS.ESTIMATE, { jobId }), method: 'POST', body: { estimated_mins: estimatedMins } }),
      transformResponse: toJobProgress,
      invalidatesTags: (_r, _e, { jobId }) => [one('Milestones', jobId), one('Jobs', jobId)],
    }),
    approveMilestone: builder.mutation<JobProgress, { jobId: string; stage: number }>({
      query: ({ jobId, stage }) => ({ url: replaceUrlPlaceholders(APIS.JOBS.MILESTONE_APPROVE, { jobId, stage }), method: 'POST' }),
      transformResponse: toJobProgress,
      invalidatesTags: (_r, _e, { jobId }) => [one('Milestones', jobId), one('Jobs', jobId), list('Jobs'), 'Notifications'],
    }),
    requestMilestoneChanges: builder.mutation<JobProgress, { jobId: string; stage: number; reason: string }>({
      query: ({ jobId, stage, reason }) => ({
        url: replaceUrlPlaceholders(APIS.JOBS.MILESTONE_CHANGES, { jobId, stage }),
        method: 'POST',
        body: { reason },
      }),
      transformResponse: toJobProgress,
      invalidatesTags: (_r, _e, { jobId }) => [one('Milestones', jobId), one('Jobs', jobId), list('Jobs'), 'Notifications'],
    }),

    // ----- Paying after 100% (customer; the hired pro sees the state) -----
    getJobPayment: builder.query<JobPayment, string>({
      query: (jobId) => replaceUrlPlaceholders(APIS.JOBS.PAYMENT, { jobId }),
      transformResponse: toJobPayment,
      providesTags: (_r, _e, jobId) => [one('Payment', jobId)],
    }),
    /** Customer: the Razorpay page to pay on; the open link is reused until it expires */
    startJobPayment: builder.mutation<{ paymentId: string; shortUrl: string }, string>({
      query: (jobId) => ({ url: replaceUrlPlaceholders(APIS.JOBS.PAYMENT, { jobId }), method: 'POST' }),
      transformResponse: (dto: { payment_id: string; short_url: string }) => ({ paymentId: dto.payment_id, shortUrl: dto.short_url }),
      invalidatesTags: (_r, _e, jobId) => [one('Payment', jobId)],
    }),
    /** Customer, back from Razorpay: the API checks the payment with Razorpay */
    confirmJobPayment: builder.mutation<JobPayment, { jobId: string; params: PaymentReturn }>({
      query: ({ jobId, params }) => ({ url: replaceUrlPlaceholders(APIS.JOBS.PAYMENT_CONFIRM, { jobId }), method: 'POST', body: params }),
      transformResponse: toJobPayment,
      invalidatesTags: (_r, _e, { jobId }) => [one('Payment', jobId), list('Payment'), one('Jobs', jobId), list('Jobs'), one('Milestones', jobId), 'Notifications'],
    }),

    // ----- Reviews: one each way once all four stages are approved -----
    getJobReviews: builder.query<JobReviews, string>({
      query: (jobId) => replaceUrlPlaceholders(APIS.JOBS.REVIEWS, { jobId }),
      transformResponse: toJobReviews,
      providesTags: (_r, _e, jobId) => [one('Reviews', jobId)],
    }),
    submitJobReview: builder.mutation<JobReviews, { jobId: string; rating: number; comment: string | null }>({
      query: ({ jobId, rating, comment }) => ({ url: replaceUrlPlaceholders(APIS.JOBS.REVIEWS, { jobId }), method: 'POST', body: { rating, comment } }),
      transformResponse: toJobReviews,
      invalidatesTags: (_r, _e, { jobId }) => [one('Reviews', jobId), one('Milestones', jobId), 'Providers', 'Notifications'],
    }),

  }),
  overrideExisting: false,
});

export const {
  useGetMyJobsQuery,
  useGetJobQuery,
  useDeleteJobMutation,
  useInviteProviderMutation,
  useGetJobProgressQuery,
  useSubmitMilestoneMutation,
  useApproveMilestoneMutation,
  useSetJobEstimateMutation,
  useRequestMilestoneChangesMutation,
  useGetJobPaymentQuery,
  useStartJobPaymentMutation,
  useConfirmJobPaymentMutation,
  useGetJobReviewsQuery,
  useSubmitJobReviewMutation,
} = jobsApi;
