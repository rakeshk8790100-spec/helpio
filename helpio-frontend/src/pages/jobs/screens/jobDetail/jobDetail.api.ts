import type { JobDetail } from '@/common/CommonDto';
import { baseApi, list, one } from '@/config/base_service/base.api';
import { APIS } from '@/config/base_service/http.config';
import { replaceUrlPlaceholders } from '@/lib/utils';
import { toJobDetail } from '@/pages/jobs/jobs.api';

/** Endpoints only the jobDetail screen uses. */
export const jobDetailApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** Hire this pro; other pending quotes are declined. Payment comes later. */
    acceptQuote: builder.mutation<JobDetail, { jobId: string; quoteId: string }>({
      query: ({ jobId, quoteId }) => ({ url: replaceUrlPlaceholders(APIS.JOBS.QUOTE_ACCEPT, { jobId, quoteId }), method: 'POST' }),
      transformResponse: toJobDetail,
      invalidatesTags: (_r, _e, { jobId }) => [one('Jobs', jobId), list('Jobs'), one('Milestones', jobId)],
    }),
    declineQuote: builder.mutation<JobDetail, { jobId: string; quoteId: string }>({
      query: ({ jobId, quoteId }) => ({ url: replaceUrlPlaceholders(APIS.JOBS.QUOTE_DECLINE, { jobId, quoteId }), method: 'POST' }),
      transformResponse: toJobDetail,
      invalidatesTags: (_r, _e, { jobId }) => [one('Jobs', jobId), list('Jobs')],
    }),
    resetStartPin: builder.mutation<JobDetail, string>({
      query: (jobId) => ({ url: replaceUrlPlaceholders(APIS.JOBS.START_PIN_RESET, { jobId }), method: 'POST' }),
      transformResponse: toJobDetail,
      invalidatesTags: (_r, _e, jobId) => [one('Jobs', jobId)],
    }),
  }),
  overrideExisting: false,
});

export const { useAcceptQuoteMutation, useDeclineQuoteMutation, useResetStartPinMutation } = jobDetailApi;
