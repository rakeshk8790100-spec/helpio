import { useState } from 'react';
import { App } from 'antd';
import type { JobsAdminLayoutProps } from '../../client/default/admin/admin.layout.types';
import { JobStatus } from '../../common/CommonEnum';
import { apiErrorMessage } from '../../lib/apiError';
import {
  useCancelAdminJobMutation,
  useGetAdminJobQuery,
  useGetAdminJobsQuery,
  useReadJobChatMutation,
} from '../../pages/admin/admin.api';
import { useUrlParams } from './useUrlParams';

const PAGE_SIZE = 25;

/** /admin/jobs: the stage filter, search and the open job (`?open=`) in the URL. */
export const useAdminJobs = (): JobsAdminLayoutProps => {
  const { message } = App.useApp();
  const { params, update, page } = useUrlParams();
  const status = Object.values(JobStatus).find((s) => s === params.get('status')) ?? null;
  const q = params.get('q') ?? '';
  const openId = params.get('open');
  const [search, setSearch] = useState(q);
  const list = useGetAdminJobsQuery({ page, pageSize: PAGE_SIZE, status: status ?? undefined, q: q || undefined });
  const detail = useGetAdminJobQuery(openId ?? '', { skip: !openId });
  const [readChat, { isLoading: readingChat }] = useReadJobChatMutation();
  const [cancelJob, { isLoading: cancelling }] = useCancelAdminJobMutation();
  const [chat, setChat] = useState<{ jobId: string; messages: { id: string; sender: string; body: string; at: string }[] } | null>(null);
  const [cancelFor, setCancelFor] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [dialogError, setDialogError] = useState<string>();

  const job = detail.currentData;
  const onClose = () => {
    setChat(null);
    update({ open: null });
  };

  return {
    status: { value: status, onChange: (value) => update({ status: value, page: null }) },
    search: { value: search, onChange: setSearch, onSearch: (value) => update({ q: value.trim() || null, page: null }) },
    list: list.isLoading
      ? { status: 'loading' }
      : !list.data
        ? { status: 'error', message: apiErrorMessage(list.error), onRetry: list.refetch }
        : {
            status: 'ready',
            rows: list.data.items,
            page: list.data.page,
            pageSize: list.data.pageSize,
            total: list.data.total,
            fetching: list.isFetching,
            onPageChange: (next) => update({ page: next > 1 ? String(next) : null }),
            onOpen: (id) => update({ open: id }),
          },
    detail: !openId
      ? null
      : !job && detail.isFetching
        ? { status: 'loading', onClose }
        : !job
          ? { status: 'error', message: apiErrorMessage(detail.error), onRetry: detail.refetch, onClose }
          : {
              status: 'ready',
              job,
              onClose,
              onCancel: job.canCancel
                ? () => {
                    setReason('');
                    setDialogError(undefined);
                    setCancelFor(job.id);
                  }
                : null,
              chat: {
                open: chat?.jobId === job.id,
                loading: readingChat,
                messages: chat?.jobId === job.id ? chat.messages : null,
                onRead: async () => {
                  try {
                    setChat({ jobId: job.id, messages: await readChat(job.id).unwrap() });
                  } catch (e) {
                    message.error(apiErrorMessage(e));
                  }
                },
                onClose: () => setChat(null),
              },
            },
    dialog: cancelFor && job
      ? {
          title: `Cancel "${job.title}"?`,
          okText: 'Cancel job',
          required: true,
          reason,
          onReasonChange: (value) => {
            setDialogError(undefined);
            setReason(value);
          },
          sending: cancelling,
          error: dialogError,
          onCancel: () => setCancelFor(null),
          onConfirm: async () => {
            const text = reason.trim();
            if (text.length < 3) return setDialogError('Add a short reason. Both sides will see it.');
            try {
              await cancelJob({ id: cancelFor, reason: text }).unwrap();
              message.success('Job cancelled. The customer and the pro were told why.');
              setCancelFor(null);
            } catch (e) {
              setDialogError(apiErrorMessage(e));
            }
          },
        }
      : null,
  };
};
