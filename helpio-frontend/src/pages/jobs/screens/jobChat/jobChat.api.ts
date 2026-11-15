import type { JobChat } from '@/common/CommonDto';
import { baseApi, one } from '@/config/base_service/base.api';
import { APIS } from '@/config/base_service/http.config';
import { replaceUrlPlaceholders } from '@/lib/utils';
import type { ChatApiDto } from './types/jobChat.dto';

const toChat = (dto: ChatApiDto): JobChat => ({
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
});

/** Newest message time per open chat: polls then fetch only what came after it */
const lastSeen = new Map<string, string>();

/** Endpoints only the jobChat screen uses. */
export const jobChatApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMessages: builder.query<JobChat, string>({
      queryFn: async (jobId, _api, _extra, baseQuery) => {
        const after = lastSeen.get(jobId);
        const result = await baseQuery({
          url: replaceUrlPlaceholders(APIS.JOBS.MESSAGES, { jobId }),
          params: after ? { after } : undefined,
        });
        if (result.error) return { error: result.error };
        const chat = toChat(result.data as ChatApiDto);
        const newest = chat.messages.at(-1);
        if (newest) lastSeen.set(jobId, newest.createdAt);
        return { data: chat };
      },
      // Later polls bring only new messages: add them to what's already shown
      merge: (current, incoming) => {
        const known = new Set(current.messages.map((m) => m.id));
        current.messages.push(...incoming.messages.filter((m) => !known.has(m.id)));
      },
      // A chat dropped from the cache starts from its full history next time
      onCacheEntryAdded: async (jobId, { cacheEntryRemoved }) => {
        await cacheEntryRemoved;
        lastSeen.delete(jobId);
      },
      providesTags: (_r, _e, jobId) => [one('Messages', jobId)],
    }),
    sendMessage: builder.mutation<void, { jobId: string; body: string }>({
      query: ({ jobId, body }) => ({ url: replaceUrlPlaceholders(APIS.JOBS.MESSAGES, { jobId }), method: 'POST', body: { body } }),
      transformResponse: () => undefined,
      invalidatesTags: (_r, _e, { jobId }) => [one('Messages', jobId)],
    }),
  }),
  overrideExisting: false,
});

export const { useGetMessagesQuery, useSendMessageMutation } = jobChatApi;
