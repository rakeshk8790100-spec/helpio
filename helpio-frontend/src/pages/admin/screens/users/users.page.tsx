import { App } from 'antd';
import { useState } from 'react';
import { UsersLayout } from '@/clients';
import { ApprovalStatus } from '@/common/CommonEnum';
import SuspenseWrapper from '@/components/wrapper/SuspenseWrapper';
import { useUrlParams } from '@/hooks/useUrlParams';
import { apiErrorMessage } from '@/lib/apiError';
import type { UsersProps } from './types/users.dto';
import { useGetAdminUserQuery, useGetAdminUsersQuery, useSetUserActiveMutation, useSignOutUserMutation } from './users.api';
import { usersColumns } from './users.colDef';

const PAGE_SIZE = 25;

/** /admin/users: filters, search and the open person (`?open=`) in the URL. */
const useAdminUsers = (): UsersProps => {
  const { message } = App.useApp();
  const { params, update, page } = useUrlParams();
  const role = (['customer', 'provider'] as const).find((r) => r === params.get('role')) ?? 'all';
  const approval = Object.values(ApprovalStatus).find((a) => a === params.get('approval')) ?? null;
  const active = params.get('active') === 'active' ? 'active' : params.get('active') === 'off' ? 'off' : 'all';
  const q = params.get('q') ?? '';
  const openId = params.get('open');
  const [search, setSearch] = useState(q);
  const list = useGetAdminUsersQuery({
    page,
    pageSize: PAGE_SIZE,
    role: role === 'all' ? undefined : role,
    approval: approval ?? undefined,
    active: active === 'all' ? undefined : active === 'active',
    q: q || undefined,
  });
  const detail = useGetAdminUserQuery(openId ?? '', { skip: !openId });
  const [setActive, { isLoading: toggling }] = useSetUserActiveMutation();
  const [signOut, { isLoading: signingOut }] = useSignOutUserMutation();
  const [dialogFor, setDialogFor] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [dialogError, setDialogError] = useState<string>();

  const onClose = () => update({ open: null });
  const user = detail.currentData;
  const name = user ? (user.name ?? user.email) : '';

  return {
    role: { value: role, onChange: (value) => update({ role: value === 'all' ? null : value, page: null }) },
    approval: { value: approval, onChange: (value) => update({ approval: value, page: null }) },
    active: { value: active, onChange: (value) => update({ active: value === 'all' ? null : value, page: null }) },
    search: {
      value: search,
      onChange: setSearch,
      onSearch: (value) => update({ q: value.trim() || null, page: null }),
    },
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
      : !user && detail.isFetching
        ? { status: 'loading', onClose }
        : !user
          ? { status: 'error', message: apiErrorMessage(detail.error), onRetry: detail.refetch, onClose }
          : {
              status: 'ready',
              user,
              busy: toggling || signingOut,
              onClose,
              onDeactivate: () => {
                setReason('');
                setDialogError(undefined);
                setDialogFor(user.id);
              },
              onActivate: async () => {
                try {
                  await setActive({ id: user.id, active: true }).unwrap();
                  message.success(`${name} can log in again.`);
                } catch (e) {
                  message.error(apiErrorMessage(e));
                }
              },
              onSignOut: async () => {
                try {
                  await signOut(user.id).unwrap();
                  message.success(`${name} is signed out on every device.`);
                } catch (e) {
                  message.error(apiErrorMessage(e));
                }
              },
            },
    dialog: dialogFor && user
      ? {
          title: `Deactivate ${name}?`,
          okText: 'Deactivate',
          required: false,
          reason,
          onReasonChange: (value) => {
            setDialogError(undefined);
            setReason(value);
          },
          sending: toggling,
          error: dialogError,
          onCancel: () => setDialogFor(null),
          onConfirm: async () => {
            try {
              await setActive({ id: dialogFor, active: false, reason: reason.trim() || undefined }).unwrap();
              message.success(`${name} is deactivated and signed out.`);
              setDialogFor(null);
            } catch (e) {
              setDialogError(apiErrorMessage(e));
            }
          },
        }
      : null,
  };
};

/** /admin/users */
const UsersPage = () => <SuspenseWrapper><UsersLayout {...useAdminUsers()} columns={usersColumns} /></SuspenseWrapper>;

export default UsersPage;
