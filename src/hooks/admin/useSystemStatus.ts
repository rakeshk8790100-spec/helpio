import { useNavigate } from 'react-router-dom';
import type { HealthRow, KpiItem, StatusLayoutProps } from '../../client/default/admin/admin.layout.types';
import type { ServiceCheck, SystemStatus } from '../../common/CommonDto';
import { RouterKeys } from '../../config/router/RouterKeys';
import type { BadgeTone } from '../../component/ui';
import { apiErrorMessage } from '../../lib/apiError';
import { formatClock, formatINR } from '../../lib/utils';
import { useGetSystemStatusQuery } from '../../pages/admin/admin.api';

// The server re-checks outside services at most every 30 s, so polling faster gains nothing
const POLL_MS = 30_000;

export const checkBadge = (check: ServiceCheck): { label: string; tone: BadgeTone } => {
  if (!check.configured) return { label: 'Not set up', tone: 'warning' };
  if (check.ok === null) return { label: "Can't test", tone: 'neutral' };
  return check.ok ? { label: 'Working', tone: 'success' } : { label: 'Problem', tone: 'error' };
};

const serviceRow = (check: ServiceCheck): HealthRow => ({
  name: check.name,
  label: check.label,
  badge: checkBadge(check),
  message: check.message,
  meta: [check.latencyMs !== null && `${check.latencyMs} ms`, `checked ${formatClock(check.checkedAt)}`].filter(Boolean).join(' · '),
});

/** Background work and this server's email, as health cards */
const backgroundRows = (s: SystemStatus): HealthRow[] => [
  ...s.heartbeats.map((h) => ({
    name: h.name,
    label: h.label,
    badge:
      h.healthy === true
        ? { label: 'Running', tone: 'success' as BadgeTone }
        : h.healthy === false
          ? { label: 'Problem', tone: 'error' as BadgeTone }
          : { label: h.lastOkAt || h.lastErrorAt ? 'Idle' : 'Nothing yet', tone: 'neutral' as BadgeTone },
    message: h.healthy === false && h.lastError ? h.lastError : h.description,
    meta: h.lastOkAt ? `Last worked ${formatClock(h.lastOkAt)}` : 'Not run yet',
  })),
  {
    name: 'email',
    label: 'Emails (this server)',
    badge:
      s.email.lastErrorAt && (!s.email.lastOkAt || s.email.lastErrorAt > s.email.lastOkAt)
        ? { label: 'Problem', tone: 'error' }
        : s.email.sent
          ? { label: 'Sending', tone: 'success' }
          : { label: 'Nothing yet', tone: 'neutral' },
    message: s.email.lastErrorAt && s.email.lastError ? s.email.lastError : `${s.email.sent} sent, ${s.email.failed} failed since the server started`,
    meta: s.email.lastOkAt ? `Last sent ${formatClock(s.email.lastOkAt)}` : '',
  },
];

/** Problems to count in the summary: broken services and failing background work */
export const problemCount = (s: SystemStatus) =>
  [s.database, ...s.integrations].filter((c) => c.configured && c.ok === false).length +
  s.heartbeats.filter((h) => h.healthy === false).length;

/** /admin/status: refreshes every 30 seconds; "Check now" asks again. */
export const useSystemStatus = (): StatusLayoutProps => {
  const navigate = useNavigate();
  const { data, error, isLoading, isFetching, refetch, fulfilledTimeStamp } = useGetSystemStatusQuery(undefined, { pollingInterval: POLL_MS });

  if (isLoading) return { status: 'loading' };
  if (!data) return { status: 'error', message: apiErrorMessage(error), onRetry: refetch };

  const problems = problemCount(data);
  const notSetUp = data.integrations.filter((c) => !c.configured).length;
  const attention: KpiItem[] = [
    {
      label: 'Sign-ups to approve',
      value: String(data.attention.approvalsWaiting),
      attention: data.attention.approvalsWaiting > 0,
      onClick: () => navigate(RouterKeys.ADMIN_APPROVALS),
    },
    {
      label: 'Payments open over a day',
      value: String(data.attention.paymentsStuck),
      hint: 'Customers who started paying but haven’t finished',
      attention: data.attention.paymentsStuck > 0,
    },
    {
      label: 'Payouts to send',
      value: String(data.attention.payoutsWaiting),
      hint: data.attention.payoutsWaiting ? `${formatINR(data.attention.payoutsWaitingAmount)} owed to pros` : 'Nothing owed',
      attention: data.attention.payoutsWaiting > 0,
    },
  ];

  return {
    status: 'ready',
    summary: {
      ok: problems === 0,
      text: problems
        ? `${problems} thing${problems === 1 ? ' needs' : 's need'} attention`
        : notSetUp
          ? `Everything set up is running (${notSetUp} service${notSetUp === 1 ? '' : 's'} not set up yet)`
          : 'Everything is running',
    },
    updatedLabel: `Updated ${fulfilledTimeStamp ? formatClock(new Date(fulfilledTimeStamp).toISOString()) : 'just now'} · refreshes every 30 seconds`,
    refreshing: isFetching,
    onRefresh: refetch,
    services: [serviceRow(data.database), ...data.integrations.map(serviceRow)],
    background: backgroundRows(data),
    attention,
    errors: data.errors.map((e) => ({
      id: e.id,
      when: formatClock(e.lastSeen),
      count: e.count,
      route: `${e.method} ${e.path}`,
      errorType: e.errorType,
      message: e.message,
    })),
    app: [
      data.env === 'prod' ? 'Live' : 'Development',
      `version ${data.version}`,
      `up since ${formatClock(data.startedAt)}`,
    ].join(' · '),
  };
};
