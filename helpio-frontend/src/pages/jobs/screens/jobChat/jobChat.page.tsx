import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { JobChatLayout } from '@/clients';
import SuspenseWrapper from '@/components/wrapper/SuspenseWrapper';
import { baseApi, poll, one } from '@/config/base_service/base.api';
import { RouterKeys, toPath } from '@/config/router/RouterKeys';
import { apiErrorMessage } from '@/lib/apiError';
import { formatClock } from '@/lib/utils';
import { useAppDispatch } from '@/redux';
import { useGetMessagesQuery, useSendMessageMutation } from './jobChat.api';
import type { JobChatLayoutProps } from './types/jobChat.dto';

/** New messages appear within this many milliseconds while the chat is open */
const POLL_MS = 5000;

/** Job chat for the customer (/jobs/:id/chat) or the hired pro (/pro/jobs/:id/chat). `backTo` is the job page. */
const useJobChat = (jobId: string, backTo: string): JobChatLayoutProps => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { data, error, isLoading, refetch } = useGetMessagesQuery(jobId, poll(POLL_MS));
  const [send, { isLoading: sending }] = useSendMessageMutation();
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState<string>();

  // Reading clears the unread badge on the job pages and the chat alert in the bell: refresh them on the way out
  useEffect(() => () => void dispatch(baseApi.util.invalidateTags([one('Jobs', jobId), 'Notifications'])), [dispatch, jobId]);

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

const JobChat = ({ id, backTo }: { id: string; backTo: string }) => <SuspenseWrapper><JobChatLayout {...useJobChat(id, backTo)} /></SuspenseWrapper>;

/** /jobs/:id/chat: the customer chats with the hired pro. */
export const CustomerJobChatPage = () => {
  const { id = '' } = useParams();
  return <JobChat key={id} id={id} backTo={toPath(RouterKeys.JOB_DETAIL, { id })} />;
};

/** /pro/jobs/:id/chat: the hired pro chats with the customer. */
export const ProviderJobChatPage = () => {
  const { id = '' } = useParams();
  return <JobChat key={id} id={id} backTo={toPath(RouterKeys.PRO_JOB_DETAIL, { id })} />;
};
