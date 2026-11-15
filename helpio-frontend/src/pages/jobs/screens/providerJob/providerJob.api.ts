import { toJobQuote, toNearbyJob } from '@/common/CommonApi';
import type { QuoteApiDto } from '@/common/CommonApi';
import type { JobQuote, NearbyJobDetail } from '@/common/CommonDto';
import { baseApi, list, one } from '@/config/base_service/base.api';
import { APIS } from '@/config/base_service/http.config';
import { replaceUrlPlaceholders } from '@/lib/utils';
import { toAttachment } from '@/pages/jobs/jobs.api';
import type { NearbyJobDetailApiDto } from './types/providerJob.dto';

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

/** Endpoints only the providerJob screen uses. */
export const providerJobApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getNearbyJob: builder.query<NearbyJobDetail, string>({
      query: (id) => replaceUrlPlaceholders(APIS.JOBS.NEARBY_DETAIL, { id }),
      transformResponse: toNearbyJobDetail,
      providesTags: (_r, _e, id) => [one('Jobs', id)],
    }),
    createQuote: builder.mutation<JobQuote, { jobId: string; amount: number; message: string | null }>({
      query: ({ jobId, amount, message }) => ({
        url: replaceUrlPlaceholders(APIS.JOBS.QUOTES, { jobId }),
        method: 'POST',
        body: { amount_paise: Math.round(amount * 100), message },
      }),
      transformResponse: (dto: QuoteApiDto) => toJobQuote(dto),
      invalidatesTags: (_r, _e, { jobId }) => [one('Jobs', jobId), list('Jobs')],
    }),
    withdrawQuote: builder.mutation<JobQuote, string>({
      query: (jobId) => ({ url: replaceUrlPlaceholders(APIS.JOBS.MY_QUOTE, { jobId }), method: 'DELETE' }),
      transformResponse: (dto: QuoteApiDto) => toJobQuote(dto),
      invalidatesTags: (_r, _e, jobId) => [one('Jobs', jobId), list('Jobs')],
    }),
    declineInvite: builder.mutation<void, string>({
      query: (jobId) => ({ url: replaceUrlPlaceholders(APIS.JOBS.INVITE_DECLINE, { jobId }), method: 'POST' }),
      invalidatesTags: (_r, _e, jobId) => [one('Jobs', jobId), list('Jobs')],
    }),
    /** Start work with the PIN the customer shares at the door */
    /** Also sets the time the whole job should take: each 25% stage gets a quarter of it */
    startJob: builder.mutation<NearbyJobDetail, { jobId: string; pin: string; estimatedMins: number }>({
      query: ({ jobId, pin, estimatedMins }) => ({
        url: replaceUrlPlaceholders(APIS.JOBS.START, { jobId }),
        method: 'POST',
        body: { pin, estimated_mins: estimatedMins },
      }),
      transformResponse: toNearbyJobDetail,
      invalidatesTags: (_r, _e, { jobId }) => [one('Jobs', jobId), list('Jobs'), one('Milestones', jobId)],
    }),
  }),
  overrideExisting: false,
});

export const { useGetNearbyJobQuery, useCreateQuoteMutation, useWithdrawQuoteMutation, useDeclineInviteMutation, useStartJobMutation } = providerJobApi;
