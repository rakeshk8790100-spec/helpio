import { App } from 'antd';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AdminsLayout } from '@/clients';
import { ApprovalStatus } from '@/common/CommonEnum';
import type { BadgeTone } from '@/components/ui';
import SuspenseWrapper from '@/components/wrapper/SuspenseWrapper';
import { RouterKeys } from '@/config/router/RouterKeys';
import { apiErrorMessage } from '@/lib/apiError';
import { formatClock } from '@/lib/utils';
import type { AdminAccount } from '@/pages/admin/types/admin.models';
import { useAppSelector } from '@/redux';
import { selectCurrentUser } from '@/redux/authSlice';
import { useApproveAdminMutation, useGetAdminsQuery, useRejectAdminMutation, useSetAdminActiveMutation } from './admins.api';
import { adminsColumns } from './admins.colDef';
import type { AdminRow, AdminRowAction, AdminsProps } from './types/admins.dto';

const badge = (a: AdminAccount): { label: string; tone: BadgeTone } => {
  if (!a.isActive) return { label: 'Deactivated', tone: 'neutral' };
  if (a.approvalStatus === ApprovalStatus.PENDING) return { label: 'Waiting for you', tone: 'warning' };
  if (a.approvalStatus === ApprovalStatus.REJECTED) return { label: 'Rejected', tone: 'error' };
  return { label: a.isOwner ? 'Owner' : 'Approved', tone: a.isOwner ? 'brand' : 'success' };
};

/** /admin/admins (owner): answer access requests; deactivate or reactivate admins. */
const useAdmins = (): AdminsProps => {
  const { message } = App.useApp();
  const { data, error, isLoading, refetch } = useGetAdminsQuery();
  const [approve] = useApproveAdminMutation();
  const [reject, { isLoading: rejecting }] = useRejectAdminMutation();
  const [setActive, { isLoading: toggling }] = useSetAdminActiveMutation();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ kind: 'reject' | 'deactivate'; admin: AdminAccount } | null>(null);
  const [reason, setReason] = useState('');
  const [dialogError, setDialogError] = useState<string>();

  if (isLoading) return { status: 'loading' };
  if (!data) return { status: 'error', message: apiErrorMessage(error), onRetry: refetch };

  const run = (admin: AdminAccount, action: () => Promise<unknown>, done: string) => async () => {
    setBusyId(admin.id);
    try {
      await action();
      message.success(done);
    } catch (e) {
      message.error(apiErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  };
  const openDialog = (kind: 'reject' | 'deactivate', admin: AdminAccount) => () => {
    setReason('');
    setDialogError(undefined);
    setDialog({ kind, admin });
  };
  const name = (a: AdminAccount) => a.name ?? a.email;

  const actions = (a: AdminAccount): AdminRowAction[] => {
    if (a.isOwner) return [];
    if (a.approvalStatus === ApprovalStatus.PENDING) {
      return [
        { label: 'Reject', danger: true, onClick: openDialog('reject', a) },
        { label: 'Approve', primary: true, onClick: run(a, () => approve(a.id).unwrap(), `${name(a)} can now log in.`) },
      ];
    }
    if (a.approvalStatus === ApprovalStatus.REJECTED) {
      return [{ label: 'Approve', onClick: run(a, () => approve(a.id).unwrap(), `${name(a)} can now log in.`) }];
    }
    return a.isActive
      ? [{ label: 'Deactivate', danger: true, onClick: openDialog('deactivate', a) }]
      : [{ label: 'Reactivate', onClick: run(a, () => setActive({ id: a.id, active: true }).unwrap(), `${name(a)} is active again.`) }];
  };

  const rows: AdminRow[] = data.map((admin) => ({
    admin,
    badge: badge(admin),
    since:
      admin.approvalStatus === ApprovalStatus.PENDING
        ? `Asked ${formatClock(admin.createdAt)}`
        : admin.approvedAt
          ? `Approved ${formatClock(admin.approvedAt)}`
          : `Joined ${formatClock(admin.createdAt)}`,
    actions: actions(admin),
    busy: busyId === admin.id,
  }));

  return {
    status: 'ready',
    rows,
    pendingCount: data.filter((a) => a.approvalStatus === ApprovalStatus.PENDING).length,
    dialog: dialog && {
      title: dialog.kind === 'reject' ? `Reject ${name(dialog.admin)}?` : `Deactivate ${name(dialog.admin)}?`,
      okText: dialog.kind === 'reject' ? 'Reject' : 'Deactivate',
      required: dialog.kind === 'reject',
      reason,
      onReasonChange: (value) => {
        setDialogError(undefined);
        setReason(value);
      },
      sending: rejecting || toggling,
      error: dialogError,
      onCancel: () => setDialog(null),
      onConfirm: async () => {
        const text = reason.trim();
        if (dialog.kind === 'reject' && text.length < 3) return setDialogError('Add a short reason.');
        try {
          if (dialog.kind === 'reject') {
            await reject({ id: dialog.admin.id, reason: text }).unwrap();
            message.success(`Request from ${name(dialog.admin)} rejected.`);
          } else {
            await setActive({ id: dialog.admin.id, active: false, reason: text || undefined }).unwrap();
            message.success(`${name(dialog.admin)} is deactivated and signed out.`);
          }
          setDialog(null);
        } catch (e) {
          setDialogError(apiErrorMessage(e));
        }
      },
    },
  };
};

const Admins = () => <SuspenseWrapper><AdminsLayout {...useAdmins()} columns={adminsColumns} /></SuspenseWrapper>;

/** /admin/admins: the owner only (the API refuses everyone else too). */
const AdminsPage = () => {
  const user = useAppSelector(selectCurrentUser);
  return user?.isOwner ? <Admins /> : <Navigate to={RouterKeys.ADMIN} replace />;
};

export default AdminsPage;
