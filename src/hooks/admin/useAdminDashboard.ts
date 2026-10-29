import { useNavigate } from 'react-router-dom';
import type { DashboardLayoutProps, KpiItem } from '../../client/default/admin/admin.layout.types';
import type { AdminDashboard } from '../../common/CommonDto';
import { JobStatus } from '../../common/CommonEnum';
import { RouterKeys } from '../../config/router/RouterKeys';
import { apiErrorMessage } from '../../lib/apiError';
import { formatClock, formatINR } from '../../lib/utils';
import { useGetAdminDashboardQuery, useGetSystemStatusQuery } from '../../pages/admin/admin.api';
import { problemCount } from './useSystemStatus';

const POLL_MS = 60_000;

/** Every stage worth showing, in the order a job moves through them */
const STAGES: [string, string][] = [
  [JobStatus.OPEN, 'Waiting for quotes'],
  [JobStatus.ACCEPTED, 'Pro hired'],
  [JobStatus.IN_PROGRESS, 'In progress'],
  [JobStatus.PAYMENT_DUE, 'Payment due'],
  [JobStatus.COMPLETED, 'Completed'],
  [JobStatus.CANCELLED, 'Cancelled'],
  [JobStatus.DISPUTED, 'In dispute'],
  [JobStatus.DRAFT, 'Drafts'],
];

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

/** One timeline entry across Helpio, in plain words */
const activityText = (a: AdminDashboard['activity'][number]) => {
  const who = a.actor ?? 'Someone';
  const stage = typeof a.data.stage === 'number' ? `${a.data.stage * 25}%` : '';
  switch (a.type) {
    case 'hired':
      return `${who} hired a pro`;
    case 'started':
      return `${who} started work with the PIN`;
    case 'milestone_submitted':
      return `${who} sent the ${stage} update`;
    case 'milestone_approved':
      return `${who} approved ${stage}`;
    case 'changes_requested':
      return `${who} asked for changes on ${stage}`;
    case 'stage_overdue':
      return `The ${stage} update is overdue`;
    case 'payment_failed':
      return "A payment didn't go through";
    case 'paid':
      return `${who} paid ${typeof a.data.amount_paise === 'number' ? formatINR(a.data.amount_paise / 100) : ''}`.trim();
    case 'reviewed':
      return `${who} left a ${String(a.data.rating ?? '')}/5 review`;
    default:
      return 'Job completed';
  }
};

/** /admin: today's numbers, whether everything is running, and the latest activity. */
export const useAdminDashboard = (): DashboardLayoutProps => {
  const navigate = useNavigate();
  const { data, error, isLoading, refetch } = useGetAdminDashboardQuery(undefined, { pollingInterval: POLL_MS });
  const { data: status } = useGetSystemStatusQuery(undefined, { pollingInterval: POLL_MS });

  if (isLoading) return { status: 'loading' };
  if (!data) return { status: 'error', message: apiErrorMessage(error), onRetry: refetch };

  const { users, jobs, money, reviews } = data;
  const toApprovals = () => navigate(RouterKeys.ADMIN_APPROVALS);
  const kpis: KpiItem[] = [
    {
      label: 'Customers',
      value: String(users.customers),
      hint: users.pendingCustomers ? `${users.pendingCustomers} waiting for approval` : 'None waiting',
      attention: users.pendingCustomers > 0,
      onClick: toApprovals,
    },
    {
      label: 'Providers',
      value: String(users.providers),
      hint: users.pendingProviders ? `${users.pendingProviders} waiting for verification` : 'None waiting',
      attention: users.pendingProviders > 0,
      onClick: toApprovals,
    },
    { label: 'Sign-ups today', value: String(users.signupsToday), hint: `${users.signupsWeek} in the last 7 days` },
    { label: 'Jobs posted today', value: String(jobs.postedToday), hint: plural(jobs.byStatus[JobStatus.OPEN] ?? 0, 'open job') },
    {
      label: 'Waiting for payment',
      value: formatINR(money.paymentDueAmount),
      hint: plural(money.paymentDueCount, 'job'),
      attention: money.paymentDueCount > 0,
    },
    { label: 'Paid today', value: formatINR(money.paidTodayAmount), hint: plural(money.paidTodayCount, 'payment') },
    {
      label: 'Failed payment tries',
      value: String(money.failedTriesDay),
      hint: 'In the last 24 hours',
      attention: money.failedTriesDay > 0,
    },
    {
      label: 'Payouts to send',
      value: formatINR(money.payoutsWaitingAmount),
      hint: plural(money.payoutsWaitingCount, 'pro') + ' waiting',
      attention: money.payoutsWaitingCount > 0,
    },
  ];
  if (reviews.count) {
    kpis.push({ label: 'Average rating', value: `${reviews.average?.toFixed(1) ?? '–'} ★`, hint: plural(reviews.count, 'review') });
  }
  const problems = status ? problemCount(status) : 0;

  return {
    status: 'ready',
    kpis,
    health: status
      ? {
          ok: problems === 0,
          text: problems ? `${problems} thing${problems === 1 ? ' needs' : 's need'} attention` : 'Everything is running',
          onOpen: () => navigate(RouterKeys.ADMIN_STATUS),
        }
      : null,
    jobs: STAGES.map(([status, label]) => ({ label, count: jobs.byStatus[status] ?? 0 })),
    activity: data.activity.map((a) => ({ id: a.id, text: activityText(a), jobTitle: a.jobTitle, when: formatClock(a.at) })),
  };
};
