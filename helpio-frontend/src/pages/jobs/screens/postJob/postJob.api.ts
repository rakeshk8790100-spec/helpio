import { toJob } from '@/common/CommonApi';
import type { Job, JobAttachment } from '@/common/CommonDto';
import { baseApi, list, one } from '@/config/base_service/base.api';
import { APIS } from '@/config/base_service/http.config';
import { replaceUrlPlaceholders } from '@/lib/utils';
import { toAttachment } from '@/pages/jobs/jobs.api';
import type { AssistJobApiDto, JobDraftSuggestion, JobInput } from './types/postJob.dto';

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

/** Endpoints only the postJob screen uses. */
export const postJobApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** No title: the API makes one from the description */
    createJob: builder.mutation<Job, JobInput>({
      query: (input) => ({ url: APIS.JOBS.CREATE, method: 'POST', body: toJobBody(input) }),
      transformResponse: toJob,
      invalidatesTags: [list('Jobs')],
    }),
    updateJob: builder.mutation<Job, JobInput & { id: string }>({
      query: ({ id, ...input }) => ({ url: replaceUrlPlaceholders(APIS.JOBS.DETAIL, { id }), method: 'PATCH', body: toJobBody(input) }),
      transformResponse: toJob,
      invalidatesTags: (_r, _e, { id }) => [one('Jobs', id), list('Jobs')],
    }),
    /** One line from the customer → a first draft of the form (Claude when configured, keywords otherwise) */
    assistJob: builder.mutation<JobDraftSuggestion, string>({
      query: (text) => ({ url: APIS.JOBS.ASSIST, method: 'POST', body: { text }, timeout: 30_000 }),
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
        return { url: replaceUrlPlaceholders(APIS.JOBS.ATTACHMENTS, { jobId }), method: 'POST', body, timeout: 60_000 };
      },
      transformResponse: toAttachment,
      invalidatesTags: (_r, _e, { jobId }) => [one('Jobs', jobId)],
    }),
    deleteAttachment: builder.mutation<void, { jobId: string; attachmentId: string }>({
      query: ({ jobId, attachmentId }) => ({ url: replaceUrlPlaceholders(APIS.JOBS.ATTACHMENT, { jobId, attachmentId }), method: 'DELETE' }),
      invalidatesTags: (_r, _e, { jobId }) => [one('Jobs', jobId)],
    }),
  }),
  overrideExisting: false,
});

export const { useCreateJobMutation, useUpdateJobMutation, useAssistJobMutation, useAddAttachmentMutation, useDeleteAttachmentMutation } = postJobApi;
