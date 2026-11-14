import { toJob, toJobQuote, toMapCircle, toNearbyJob } from '../../common/CommonApi';
import type { JobApiDto, QuoteApiDto } from '../../common/CommonApi';
import type {
  Job,
  JobAttachment,
  JobChat,
  JobDetail,
  JobPayment,
  JobProgress,
  JobQuote,
  JobReview,
  JobReviews,
  NearbyJobDetail,
  NearbyJobs,
  ProviderJob,
} from '../../common/CommonDto';
import { baseApi } from '../../config/base_service/base.api';
import type {
  AssistJobApiDto,
  AttachmentApiDto,
  ChatApiDto,
  JobDetailApiDto,
  JobDraftSuggestion,
  JobInput,
  JobPaymentApiDto,
  JobReviewApiDto,
  JobReviewsApiDto,
  MilestonesApiDto,
  NearbyFilters,
  NearbyJobDetailApiDto,
  NearbyJobsApiDto,
  PaymentReturn,
  ProviderJobApiDto,
} from './types/jobs.dto';

const toJobDetail = (dto: JobDetailApiDto): JobDetail => ({
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

const toNearbyJobDetail = (dto: NearbyJobDetailApiDto): NearbyJobDetail => ({
  ...toNearbyJob(dto),
  attachments: dto.attachments.map(toAttachment),
  canQuote: dto.can_quote,
  hired: dto.hired,
  exactLocation: dto.exact_location && {
    coordinates:
      dto.exact_location.latitude !== null && dto.exact_location.longitude !== null
        ? { latitude: dto.exact_location.latitude, longitude: dto.exact_location.longitude }
        : null,
    pincode: dto.exact_location.pincode,
    areaName: dto.exact_location.area_name,
    addressLine: dto.exact_location.address_line,
  },
  customerName: dto.customer_name,
  startedAt: dto.started_at,
  unreadMessages: dto.unread_messages,
  customerRating: dto.customer_rating,
});

const toAttachment = (dto: AttachmentApiDto): JobAttachment => ({ id: dto.id, contentType: dto.content_type, url: dto.url });

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

const toProviderJob = (dto: ProviderJobApiDto): ProviderJob => ({
  ...toNearbyJob(dto),
  customerName: dto.customer_name,
  startedAt: dto.started_at,
  amount: dto.amount_paise / 100,
  earned: dto.earned_paise / 100,
  milestoneStage: dto.milestone_stage,
  milestoneStatus: dto.milestone_status,
  nextDueAt: dto.next_due_at,
  unreadMessages: dto.unread_messages,
});

/** Only fields the caller set are sent, so a draft save never clears what the customer left untouched. */
const toJobBody = (input: JobInput) => {
  const body: Record<string, unknown> = { submit: input.submit };
  if (input.title !== undefined) body.title = input.title;
  if (input.description !== undefined) body.description = input.description;
  if (input.categoryId !== undefined) body.category_id = input.categoryId;
  if (input.coordinates !== undefined) {
    body.latitude = input.coordinates?.latitude ?? null;
    body.longitude = input.coordinates?.longitude ?? null;
  }
  if (input.pincode !== undefined) body.pincode = input.pincode;
  if (input.areaName !== undefined) body.area_name = input.areaName;
  if (input.addressLine !== undefined) body.address_line = input.addressLine;
  if (input.budget !== undefined) body.budget_paise = input.budget === null ? null : Math.round(input.budget * 100);
  if (input.scheduledAt !== undefined) body.scheduled_at = input.scheduledAt;
  if (input.durationMins !== undefined) body.duration_mins = input.durationMins;
  if (input.isEmergency !== undefined) body.is_emergency = input.isEmergency;
  return body;
};

/** Customer jobs (post, edit, photos, quotes received) and provider job search and quoting. */
export const jobsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ----- Customer -----
    getMyJobs: builder.query<Job[], void>({
      query: () => '/jobs/mine',
      transformResponse: (dto: JobApiDto[]) => dto.map(toJob),
      providesTags: ['Jobs'],
    }),
    getJob: builder.query<JobDetail, string>({
      query: (id) => `/jobs/${id}`,
      transformResponse: toJobDetail,
      providesTags: ['Jobs'],
    }),
    /** Hire this pro; other pending quotes are declined. Payment comes later. */
    acceptQuote: builder.mutation<JobDetail, { jobId: string; quoteId: string }>({
      query: ({ jobId, quoteId }) => ({ url: `/jobs/${jobId}/quotes/${quoteId}/accept`, method: 'POST' }),
      transformResponse: toJobDetail,
      invalidatesTags: ['Jobs', 'Milestones'],
    }),
    declineQuote: builder.mutation<JobDetail, { jobId: string; quoteId: string }>({
      query: ({ jobId, quoteId }) => ({ url: `/jobs/${jobId}/quotes/${quoteId}/decline`, method: 'POST' }),
      transformResponse: toJobDetail,
      invalidatesTags: ['Jobs'],
    }),
    /** No title: the API makes one from the description */
    createJob: builder.mutation<Job, JobInput>({
      query: (input) => ({ url: '/jobs', method: 'POST', body: toJobBody(input) }),
      transformResponse: toJob,
      invalidatesTags: ['Jobs'],
    }),
    updateJob: builder.mutation<Job, JobInput & { id: string }>({
      query: ({ id, ...input }) => ({ url: `/jobs/${id}`, method: 'PATCH', body: toJobBody(input) }),
      transformResponse: toJob,
      invalidatesTags: ['Jobs'],
    }),
    /** Drafts only; posted jobs can't be deleted */
    deleteJob: builder.mutation<void, string>({
      query: (id) => ({ url: `/jobs/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Jobs'],
    }),
    /** One line from the customer → a first draft of the form (Claude when configured, keywords otherwise) */
    assistJob: builder.mutation<JobDraftSuggestion, string>({
      query: (text) => ({ url: '/jobs/assist', method: 'POST', body: { text }, timeout: 30_000 }),
      transformResponse: (dto: AssistJobApiDto) => ({
        title: dto.title,
        categoryId: dto.category_id,
        description: dto.description,
        durationMins: dto.duration_mins,
        isEmergency: dto.is_emergency,
        source: dto.source,
      }),
    }),
    /** Uploads one photo or video; the API stores it on Cloudinary and saves its URL on the job */
    addAttachment: builder.mutation<JobAttachment, { jobId: string; file: File }>({
      query: ({ jobId, file }) => {
        const body = new FormData();
        body.append('file', file);
        // 60s: a 10 MB video on a slow connection takes longer than the default timeout
        return { url: `/jobs/${jobId}/attachments`, method: 'POST', body, timeout: 60_000 };
      },
      transformResponse: toAttachment,
      invalidatesTags: ['Jobs'],
    }),
    deleteAttachment: builder.mutation<void, { jobId: string; attachmentId: string }>({
      query: ({ jobId, attachmentId }) => ({ url: `/jobs/${jobId}/attachments/${attachmentId}`, method: 'DELETE' }),
      invalidatesTags: ['Jobs'],
    }),

    /** Send an open job straight to a chosen pro */
    inviteProvider: builder.mutation<void, { jobId: string; providerId: string; message: string | null }>({
      query: ({ jobId, providerId, message }) => ({
        url: `/jobs/${jobId}/invites`,
        method: 'POST',
        body: { provider_id: providerId, message },
      }),
      transformResponse: () => undefined,
      invalidatesTags: ['Jobs'],
    }),

    resetStartPin: builder.mutation<JobDetail, string>({
      query: (jobId) => ({ url: `/jobs/${jobId}/start-pin/reset`, method: 'POST' }),
      transformResponse: toJobDetail,
      invalidatesTags: ['Jobs'],
    }),

    // ----- Chat (customer and hired pro) -----
    getMessages: builder.query<JobChat, string>({
      query: (jobId) => `/jobs/${jobId}/messages`,
      transformResponse: (dto: ChatApiDto): JobChat => ({
        jobId: dto.job_id,
        jobTitle: dto.job_title,
        otherName: dto.other_name,
        otherAvatarUrl: dto.other_avatar_url,
        messages: dto.messages.map((m) => ({
          id: m.id,
          body: m.body,
          mine: m.mine,
          senderName: m.sender_name,
          createdAt: m.created_at,
        })),
      }),
      providesTags: ['Messages'],
    }),
    sendMessage: builder.mutation<void, { jobId: string; body: string }>({
      query: ({ jobId, body }) => ({ url: `/jobs/${jobId}/messages`, method: 'POST', body: { body } }),
      transformResponse: () => undefined,
      invalidatesTags: ['Messages'],
    }),

    // ----- Progress: four 25% stages (customer and hired pro) -----
    getJobProgress: builder.query<JobProgress, string>({
      query: (jobId) => `/jobs/${jobId}/milestones`,
      transformResponse: toJobProgress,
      providesTags: ['Milestones'],
    }),
    /** Hired pro: photos and a note for the open stage, sent to the customer for approval */
    submitMilestone: builder.mutation<JobProgress, { jobId: string; stage: number; note: string; files: File[] }>({
      query: ({ jobId, stage, note, files }) => {
        const body = new FormData();
        body.append('note', note);
        files.forEach((file) => body.append('files', file));
        // 60s: several photos on a slow connection take longer than the default timeout
        return { url: `/jobs/${jobId}/milestones/${stage}/submit`, method: 'POST', body, timeout: 60_000 };
      },
      transformResponse: toJobProgress,
      invalidatesTags: ['Milestones', 'Jobs', 'Notifications'],
    }),
    /** Jobs started before estimates existed: the pro sets it once */
    setJobEstimate: builder.mutation<JobProgress, { jobId: string; estimatedMins: number }>({
      query: ({ jobId, estimatedMins }) => ({ url: `/jobs/${jobId}/estimate`, method: 'POST', body: { estimated_mins: estimatedMins } }),
      transformResponse: toJobProgress,
      invalidatesTags: ['Milestones', 'Jobs'],
    }),
    approveMilestone: builder.mutation<JobProgress, { jobId: string; stage: number }>({
      query: ({ jobId, stage }) => ({ url: `/jobs/${jobId}/milestones/${stage}/approve`, method: 'POST' }),
      transformResponse: toJobProgress,
      invalidatesTags: ['Milestones', 'Jobs', 'Notifications'],
    }),
    requestMilestoneChanges: builder.mutation<JobProgress, { jobId: string; stage: number; reason: string }>({
      query: ({ jobId, stage, reason }) => ({
        url: `/jobs/${jobId}/milestones/${stage}/request-changes`,
        method: 'POST',
        body: { reason },
      }),
      transformResponse: toJobProgress,
      invalidatesTags: ['Milestones', 'Jobs', 'Notifications'],
    }),

    // ----- Paying after 100% (customer; the hired pro sees the state) -----
    getJobPayment: builder.query<JobPayment, string>({
      query: (jobId) => `/jobs/${jobId}/payment`,
      transformResponse: toJobPayment,
      providesTags: ['Payment'],
    }),
    /** Customer: the Razorpay page to pay on; the open link is reused until it expires */
    startJobPayment: builder.mutation<{ paymentId: string; shortUrl: string }, string>({
      query: (jobId) => ({ url: `/jobs/${jobId}/payment`, method: 'POST' }),
      transformResponse: (dto: { payment_id: string; short_url: string }) => ({ paymentId: dto.payment_id, shortUrl: dto.short_url }),
      invalidatesTags: ['Payment'],
    }),
    /** Customer, back from Razorpay: the API checks the payment with Razorpay */
    confirmJobPayment: builder.mutation<JobPayment, { jobId: string; params: PaymentReturn }>({
      query: ({ jobId, params }) => ({ url: `/jobs/${jobId}/payment/confirm`, method: 'POST', body: params }),
      transformResponse: toJobPayment,
      invalidatesTags: ['Payment', 'Jobs', 'Milestones', 'Notifications'],
    }),

    // ----- Reviews: one each way once all four stages are approved -----
    getJobReviews: builder.query<JobReviews, string>({
      query: (jobId) => `/jobs/${jobId}/reviews`,
      transformResponse: toJobReviews,
      providesTags: ['Reviews'],
    }),
    submitJobReview: builder.mutation<JobReviews, { jobId: string; rating: number; comment: string | null }>({
      query: ({ jobId, rating, comment }) => ({ url: `/jobs/${jobId}/reviews`, method: 'POST', body: { rating, comment } }),
      transformResponse: toJobReviews,
      invalidatesTags: ['Reviews', 'Milestones', 'Providers', 'Notifications'],
    }),

    // ----- Provider -----
    /** Jobs I was hired for, with progress */
    getProviderJobs: builder.query<ProviderJob[], 'active' | 'completed'>({
      query: (bucket) => ({ url: '/jobs/provider/mine', params: { bucket } }),
      transformResponse: (dto: ProviderJobApiDto[]) => dto.map(toProviderJob),
      providesTags: ['Jobs', 'Milestones'],
    }),
    /** Start work with the PIN the customer shares at the door */
    /** Also sets the time the whole job should take: each 25% stage gets a quarter of it */
    startJob: builder.mutation<NearbyJobDetail, { jobId: string; pin: string; estimatedMins: number }>({
      query: ({ jobId, pin, estimatedMins }) => ({
        url: `/jobs/${jobId}/start`,
        method: 'POST',
        body: { pin, estimated_mins: estimatedMins },
      }),
      transformResponse: toNearbyJobDetail,
      invalidatesTags: ['Jobs', 'Milestones'],
    }),
    declineInvite: builder.mutation<void, string>({
      query: (jobId) => ({ url: `/jobs/${jobId}/invite/decline`, method: 'POST' }),
      invalidatesTags: ['Jobs'],
    }),
    getNearbyJobs: builder.query<NearbyJobs, NearbyFilters>({
      query: (f) => ({
        url: '/jobs/nearby',
        params: {
          ...(f.categoryId && { category_id: f.categoryId }),
          ...(f.maxKm && { max_km: f.maxKm }),
          ...(f.hasBudget && { has_budget: true }),
          ...(f.urgentOnly && { urgent_only: true }),
        },
      }),
      transformResponse: (dto: NearbyJobsApiDto): NearbyJobs => ({
        area: dto.area && toMapCircle(dto.area),
        categories: dto.categories,
        jobs: dto.jobs.map(toNearbyJob),
      }),
      providesTags: ['Jobs'],
    }),
    getNearbyJob: builder.query<NearbyJobDetail, string>({
      query: (id) => `/jobs/nearby/${id}`,
      transformResponse: toNearbyJobDetail,
      providesTags: ['Jobs'],
    }),
    createQuote: builder.mutation<JobQuote, { jobId: string; amount: number; message: string | null }>({
      query: ({ jobId, amount, message }) => ({
        url: `/jobs/${jobId}/quotes`,
        method: 'POST',
        body: { amount_paise: Math.round(amount * 100), message },
      }),
      transformResponse: (dto: QuoteApiDto) => toJobQuote(dto),
      invalidatesTags: ['Jobs'],
    }),
    withdrawQuote: builder.mutation<JobQuote, string>({
      query: (jobId) => ({ url: `/jobs/${jobId}/quotes/mine`, method: 'DELETE' }),
      transformResponse: (dto: QuoteApiDto) => toJobQuote(dto),
      invalidatesTags: ['Jobs'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetMyJobsQuery,
  useGetJobQuery,
  useCreateJobMutation,
  useUpdateJobMutation,
  useDeleteJobMutation,
  useAssistJobMutation,
  useAddAttachmentMutation,
  useDeleteAttachmentMutation,
  useGetNearbyJobsQuery,
  useGetNearbyJobQuery,
  useCreateQuoteMutation,
  useWithdrawQuoteMutation,
  useInviteProviderMutation,
  useDeclineInviteMutation,
  useAcceptQuoteMutation,
  useDeclineQuoteMutation,
  useResetStartPinMutation,
  useStartJobMutation,
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
  useGetProviderJobsQuery,
  useGetMessagesQuery,
  useSendMessageMutation,
} = jobsApi;
