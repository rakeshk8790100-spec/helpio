import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { JobChatLayoutProps } from '../client/default/jobs/jobs.layout.types';
import { baseApi } from '../config/base_service/base.api';
import { apiErrorMessage } from '../lib/apiError';
import { formatClock } from '../lib/utils';
import { useGetMessagesQuery, useSendMessageMutation } from '../pages/jobs/jobs.api';
import { useAppDispatch } from '../redux';

/** New messages appear within this many milliseconds while the chat is open */
const POLL_MS = 5000;

/** Job chat for the customer (/jobs/:id/chat) or the hired pro (/pro/jobs/:id/chat). `backTo` is the job page. */
export const useJobChat = (jobId: string, backTo: string): JobChatLayoutProps => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { data, error, isLoading, refetch } = useGetMessagesQuery(jobId, { pollingInterval: POLL_MS, skipPollingIfUnfocused: true });
  const [send, { isLoading: sending }] = useSendMessageMutation();
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState<string>();

  // Reading clears the unread badge on the job pages and the chat alert in the bell: refresh them on the way out
  useEffect(() => () => void dispatch(baseApi.util.invalidateTags(['Jobs', 'Notifications'])), [dispatch]);

  if (isLoading) return { status: 'loading' };
  if (!data) return { status: 'error', message: apiErrorMessage(error), onRetry: refetch };

  return {
    status: 'ready',
    title: data.jobTitle,
    otherName: data.otherName,
    otherAvatarUrl: data.otherAvatarUrl,
    messages: data.messages.map((m) => ({ id: m.id, body: m.body, mine: m.mine, time: formatClock(m.createdAt) })),
    draft,
    onDraftChange: (value) => {
      setSendError(undefined);
      setDraft(value);
    },
    sending,
    error: sendError,
    onSend: async () => {
      const body = draft.trim();
      if (!body || sending) return;
      try {
        await send({ jobId, body }).unwrap();
        setDraft('');
      } catch (e) {
        setSendError(apiErrorMessage(e));
      }
    },
    onBack: () => navigate(backTo),
  };
};
