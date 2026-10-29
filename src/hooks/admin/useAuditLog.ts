import { useSearchParams } from 'react-router-dom';
import type { AuditLogLayoutProps } from '../../client/default/admin/admin.layout.types';
import type { BadgeTone } from '../../component/ui';
import { apiErrorMessage } from '../../lib/apiError';
import { formatClock } from '../../lib/utils';
import { useGetAuditLogQuery } from '../../pages/admin/admin.api';

const PAGE_SIZE = 25;

/** Every action the API records, in plain words; unknown ones show as recorded */
const ACTIONS: Record<string, { label: string; tone: BadgeTone }> = {
  'admin.login': { label: 'Logged in', tone: 'neutral' },
  'admin.login_failed': { label: 'Failed log-in', tone: 'error' },
  'admin.access_requested': { label: 'Asked for access', tone: 'warning' },
  'admin.approve': { label: 'Approved admin', tone: 'success' },
  'admin.reject': { label: 'Rejected admin', tone: 'error' },
  'admin.deactivate': { label: 'Deactivated admin', tone: 'error' },
  'admin.activate': { label: 'Reactivated admin', tone: 'success' },
  'user.approve': { label: 'Approved sign-up', tone: 'success' },
  'user.reject': { label: 'Rejected sign-up', tone: 'error' },
};

/** /admin/audit: newest first; the page and action filter live in the URL. */
export const useAuditLog = (): AuditLogLayoutProps => {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const action = params.get('action');
  const { data, error, isLoading, isFetching, refetch } = useGetAuditLogQuery({ page, pageSize: PAGE_SIZE, action: action ?? undefined });

  const update = (changes: Record<string, string | null>) =>
    setParams((current) => {
      Object.entries(changes).forEach(([key, value]) => (value ? current.set(key, value) : current.delete(key)));
      return current;
    });

  return {
    filter: {
      options: Object.entries(ACTIONS).map(([value, { label }]) => ({ value, label })),
      value: action,
      onChange: (value) => update({ action: value, page: null }),
    },
    entries: isLoading
      ? { status: 'loading' }
      : !data
        ? { status: 'error', message: apiErrorMessage(error), onRetry: refetch }
        : {
            status: 'ready',
            rows: data.items.map((entry) => ({
              ...entry,
              actionLabel: ACTIONS[entry.action]?.label ?? entry.action,
              tone: ACTIONS[entry.action]?.tone ?? 'neutral',
              when: formatClock(entry.createdAt),
            })),
            page: data.page,
            pageSize: data.pageSize,
            total: data.total,
            fetching: isFetching,
            onPageChange: (next) => update({ page: next > 1 ? String(next) : null }),
          },
  };
};
