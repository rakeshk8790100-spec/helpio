import { App } from 'antd';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ApprovalsLayout } from '@/clients';
import { OnboardingStatus } from '@/common/CommonEnum';
import SuspenseWrapper from '@/components/wrapper/SuspenseWrapper';
import { apiErrorMessage } from '@/lib/apiError';
import { formatClock, formatDays } from '@/lib/utils';
import type { ApprovalItem } from '@/pages/admin/types/admin.models';
import { useApproveUserMutation, useGetApprovalsQuery, useRejectUserMutation } from './approvals.api';
import { approvalsColumns } from './approvals.colDef';
import type { ApprovalFilter, ApprovalRow, ApprovalsProps } from './types/approvals.dto';

const FILTERS: { value: ApprovalFilter; label: string }[] = [
  { value: 'all', label: 'Everyone' },
  { value: 'customer', label: 'Customers' },
  { value: 'provider', label: 'Providers' },
];

const SHOWN_SKILLS = 3;

/** What a provider offers, in a few lines for the table */
const providerDetails = (p: NonNullable<ApprovalItem['provider']>) => {
  if (p.onboardingStatus !== OnboardingStatus.COMPLETE) return ['Still signing up (skills or service area missing)'];
  const more = p.skills.length - SHOWN_SKILLS;
  return [
    p.skills.slice(0, SHOWN_SKILLS).join(', ') + (more > 0 ? ` +${more}` : ''),
    [[p.areaName, p.pincode].filter(Boolean).join(' '), p.radiusKm && `up to ${p.radiusKm} km`].filter(Boolean).join(' · '),
    p.workDays.length ? `Works ${formatDays(p.workDays)}` : '',
  ].filter(Boolean);
};

/** /admin/approvals: the queue of new customers and providers; the role filter lives in `?role=`. */
const useApprovals = (): ApprovalsProps => {
  const { message } = App.useApp();
  const [params, setParams] = useSearchParams();
  const filter = FILTERS.find((f) => f.value === params.get('role'))?.value ?? 'all';
  const { data, error, isLoading, refetch } = useGetApprovalsQuery(filter === 'all' ? undefined : filter);
  const [approve] = useApproveUserMutation();
  const [reject, { isLoading: rejecting }] = useRejectUserMutation();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<ApprovalItem | null>(null);
  const [reason, setReason] = useState('');
  const [dialogError, setDialogError] = useState<string>();

  if (isLoading) return { status: 'loading' };
  if (!data) return { status: 'error', message: apiErrorMessage(error), onRetry: refetch };

  const name = (item: ApprovalItem) => item.name ?? item.email;
  const rows: ApprovalRow[] = data.map((item) => ({
    item,
    roleLabel: item.role === 'provider' ? 'Provider' : 'Customer',
    signedUp: formatClock(item.createdAt),
    details: item.provider ? providerDetails(item.provider) : [],
    busy: busyId === item.id,
    onApprove: async () => {
      setBusyId(item.id);
      try {
        await approve(item.id).unwrap();
        message.success(
          item.role === 'provider' ? `${name(item)} can now quote on jobs.` : `${name(item)} can now log in.`,
        );
      } catch (e) {
        message.error(apiErrorMessage(e));
      } finally {
        setBusyId(null);
      }
    },
    onReject: () => {
      setReason('');
      setDialogError(undefined);
      setRejectFor(item);
    },
  }));

  return {
    status: 'ready',
    filter: {
      value: filter,
      options: FILTERS,
      onChange: (value) => setParams(value === 'all' ? {} : { role: value }, { replace: true }),
    },
    rows,
    emptyText:
      filter === 'provider'
        ? 'No providers waiting. They show up here once they finish signing up.'
        : filter === 'customer'
          ? 'No customers waiting.'
          : 'Nobody is waiting. New sign-ups show up here while approval is switched on.',
    dialog: rejectFor && {
      title: `Reject ${name(rejectFor)}?`,
      okText: 'Reject',
      required: true,
      reason,
      onReasonChange: (value) => {
        setDialogError(undefined);
        setReason(value);
      },
      sending: rejecting,
      error: dialogError,
      onCancel: () => setRejectFor(null),
      onConfirm: async () => {
        const text = reason.trim();
        if (text.length < 3) return setDialogError('Add a short reason. They will see it in the email.');
        try {
          await reject({ id: rejectFor.id, reason: text }).unwrap();
          message.success(`${name(rejectFor)} was rejected and emailed the reason.`);
          setRejectFor(null);
        } catch (e) {
          setDialogError(apiErrorMessage(e));
        }
      },
    },
  };
};

/** /admin/approvals */
const ApprovalsPage = () => <SuspenseWrapper><ApprovalsLayout {...useApprovals()} columns={approvalsColumns} /></SuspenseWrapper>;

export default ApprovalsPage;
