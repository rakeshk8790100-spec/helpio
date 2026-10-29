import { useState } from 'react';
import { App } from 'antd';
import type { ReviewsAdminLayoutProps } from '../../client/default/admin/admin.layout.types';
import type { AdminReviewRow } from '../../common/CommonDto';
import { apiErrorMessage } from '../../lib/apiError';
import { useGetAdminReviewsQuery, useSetReviewHiddenMutation } from '../../pages/admin/admin.api';
import { useUrlParams } from './useUrlParams';

const PAGE_SIZE = 25;

/** /admin/reviews: hide abusive reviews with a reason, or show them again; filters in the URL. */
export const useAdminReviews = (): ReviewsAdminLayoutProps => {
  const { message } = App.useApp();
  const { params, update, page } = useUrlParams();
  const visibility = params.get('show') === 'hidden' ? 'hidden' : params.get('show') === 'visible' ? 'visible' : 'all';
  const stars = Number(params.get('stars')) || null;
  const list = useGetAdminReviewsQuery({
    page,
    pageSize: PAGE_SIZE,
    hidden: visibility === 'all' ? undefined : visibility === 'hidden',
    stars: stars ?? undefined,
  });
  const [setHidden, { isLoading: saving }] = useSetReviewHiddenMutation();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [hideFor, setHideFor] = useState<AdminReviewRow | null>(null);
  const [reason, setReason] = useState('');
  const [dialogError, setDialogError] = useState<string>();

  return {
    visibility: { value: visibility, onChange: (value) => update({ show: value === 'all' ? null : value, page: null }) },
    stars: { value: stars, onChange: (value) => update({ stars: value ? String(value) : null, page: null }) },
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
            busyId,
            onHide: (review) => {
              setReason('');
              setDialogError(undefined);
              setHideFor(review);
            },
            onShow: async (review) => {
              setBusyId(review.id);
              try {
                await setHidden({ id: review.id, hidden: false }).unwrap();
                message.success('The review counts again.');
              } catch (e) {
                message.error(apiErrorMessage(e));
              } finally {
                setBusyId(null);
              }
            },
          },
    dialog: hideFor && {
      title: `Hide this ${hideFor.stars}-star review?`,
      okText: 'Hide',
      required: true,
      reason,
      onReasonChange: (value) => {
        setDialogError(undefined);
        setReason(value);
      },
      sending: saving,
      error: dialogError,
      onCancel: () => setHideFor(null),
      onConfirm: async () => {
        const text = reason.trim();
        if (text.length < 3) return setDialogError('Add a short reason, for the audit log.');
        try {
          await setHidden({ id: hideFor.id, hidden: true, reason: text }).unwrap();
          message.success("Hidden. It no longer counts in ratings or shows on profiles.");
          setHideFor(null);
        } catch (e) {
          setDialogError(apiErrorMessage(e));
        }
      },
    },
  };
};
