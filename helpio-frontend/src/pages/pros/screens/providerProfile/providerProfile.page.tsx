import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { App } from 'antd';
import type { ProviderProfileLayoutProps } from '../client/default/pros/pros.layout.types';
import type { AuthUser } from '../common/CommonDto';
import { JobStatus, UserRole } from '../common/CommonEnum';
import { RouterKeys, toPath, withQuery } from '../config/router/RouterKeys';
import { apiErrorMessage } from '../lib/apiError';
import { formatDays, formatShortDate, formatTime } from '../lib/utils';
import { useGetMyJobsQuery, useInviteProviderMutation } from '../pages/jobs/jobs.api';
import { useGetProviderQuery } from '../pages/pros/pros.api';

/** /pros/:id: a pro's public profile. Customers can send them one of their open jobs, or post a new one for them. */
export const useProviderProfile = (id: string, user: AuthUser): ProviderProfileLayoutProps => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const isCustomer = user.role === UserRole.CUSTOMER;
  const { data: pro, error, isLoading, refetch } = useGetProviderQuery({ id });
  const myJobs = useGetMyJobsQuery(undefined, { skip: !isCustomer });
  const [invite, { isLoading: sending }] = useInviteProviderMutation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pickedJobId, setPickedJobId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [sendError, setSendError] = useState<string>();

  if (isLoading) return { status: 'loading' };
  if (!pro) return { status: 'error', message: apiErrorMessage(error), onRetry: refetch };

  const openJobs = (myJobs.data ?? []).filter((job) => job.status === JobStatus.OPEN);
  const selectedJobId = pickedJobId ?? openJobs[0]?.id ?? null;
  const slot = pro.availability[0];
  const name = pro.displayName;

  return {
    status: 'ready',
    provider: pro,
    hours: slot ? `${formatDays(pro.availability.map((s) => s.day))}, ${formatTime(slot.start)}–${formatTime(slot.end)}` : null,
    isOwnProfile: user.id === pro.id,
    onBack: () => (window.history.length > 1 ? navigate(-1) : navigate(RouterKeys.SEARCH)),
    request: isCustomer
      ? {
          open: sheetOpen,
          onOpen: () => {
            setSendError(undefined);
            setSheetOpen(true);
          },
          onClose: () => setSheetOpen(false),
          providerName: name,
          jobs: myJobs.isLoading
            ? { status: 'loading' }
            : !myJobs.data
              ? { status: 'error', message: apiErrorMessage(myJobs.error), onRetry: myJobs.refetch }
              : {
                  status: 'ready',
                  items: openJobs.map((job) => ({
                    id: job.id,
                    title: job.title,
                    meta: [job.categoryName, job.areaName, `posted ${formatShortDate(job.updatedAt)}`].filter(Boolean).join(' · '),
                  })),
                },
          selectedJobId,
          onSelectJob: setPickedJobId,
          message: note,
          onMessageChange: setNote,
          sending,
          error: sendError,
          onSend: async () => {
            if (!selectedJobId) return;
            setSendError(undefined);
            try {
              await invite({ jobId: selectedJobId, providerId: pro.id, message: note.trim() || null }).unwrap();
              message.success(`Request sent. ${name} will reply with a quote.`);
              setSheetOpen(false);
              navigate(toPath(RouterKeys.JOB_DETAIL, { id: selectedJobId }));
            } catch (e) {
              setSendError(apiErrorMessage(e));
            }
          },
          // A pro with one kind of work: the new job starts in that category
          onPostNew: () =>
            navigate(
              withQuery(RouterKeys.POST_JOB, {
                invite: pro.id,
                ...(pro.categories.length === 1 && { category: pro.categories[0].id }),
              }),
            ),
        }
      : null,
  };
};
