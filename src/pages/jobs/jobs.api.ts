import { toJob, toJobQuote, toMapCircle, toNearbyJob } from '../../common/CommonApi';
import type { JobApiDto, QuoteApiDto } from '../../common/CommonApi';
import type { Job, JobAttachment, JobDetail, JobQuote, NearbyJobDetail, NearbyJobs } from '../../common/CommonDto';
import { baseApi } from '../../config/base_service/base.api';
import type {
  AttachmentApiDto,
  JobDetailApiDto,
  JobInput,
  NearbyFilters,
  NearbyJobDetailApiDto,
  NearbyJobsApiDto,
} from './types/jobs.dto';

const toAttachment = (dto: AttachmentApiDto): JobAttachment => ({ id: dto.id, contentType: dto.content_type, url: dto.url });

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
      transformResponse: (dto: JobDetailApiDto): JobDetail => ({
        ...toJob(dto),
        attachments: dto.attachments.map(toAttachment),
        quotes: dto.quotes.map((q) => ({
          ...toJobQuote(q),
          providerLabel: q.provider_label,
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
      }),
      providesTags: ['Jobs'],
    }),
    createJob: builder.mutation<Job, JobInput & { title: string }>({
      query: (input) => ({ url: '/jobs', method: 'POST', body: toJobBody(input) }),
      transformResponse: toJob,
      invalidatesTags: ['Jobs'],
    }),
    updateJob: builder.mutation<Job, JobInput & { id: string }>({
      query: ({ id, ...input }) => ({ url: `/jobs/${id}`, method: 'PATCH', body: toJobBody(input) }),
      transformResponse: toJob,
      invalidatesTags: ['Jobs'],
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

    // ----- Provider -----
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
      transformResponse: (dto: NearbyJobDetailApiDto): NearbyJobDetail => ({
        ...toNearbyJob(dto),
        attachments: dto.attachments.map(toAttachment),
        canQuote: dto.can_quote,
      }),
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
  useAddAttachmentMutation,
  useDeleteAttachmentMutation,
  useGetNearbyJobsQuery,
  useGetNearbyJobQuery,
  useCreateQuoteMutation,
  useWithdrawQuoteMutation,
  useInviteProviderMutation,
  useDeclineInviteMutation,
} = jobsApi;
