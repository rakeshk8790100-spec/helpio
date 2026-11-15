import { useNavigate, useSearchParams } from 'react-router-dom';
import { EarningsLayout } from '@/clients';
import type { EarningItem } from '@/common/CommonDto';
import { PayoutStatus } from '@/common/CommonEnum';
import { paymentMethodLabel } from '@/common/CommonLabels';
import SuspenseWrapper from '@/components/wrapper/SuspenseWrapper';
import { RouterKeys, toPath } from '@/config/router/RouterKeys';
import { apiErrorMessage } from '@/lib/apiError';
import { formatShortDate } from '@/lib/utils';
import { useGetProviderEarningsQuery } from './earnings.api';
import type { EarningRow, EarningsLayoutProps } from './types/earnings.dto';
import { EarningsTab } from './types/earnings.enum';

type Tab = { value: EarningsTab; label: string; payout: PayoutStatus | null; empty: string };

// Never empty: the first tab is the default
const TABS: [Tab, ...Tab[]] = [
  { value: EarningsTab.ALL, label: 'All', payout: null, empty: 'No earnings yet. Once a customer pays for a finished job, it shows up here.' },
  {
    value: EarningsTab.TO_RECEIVE,
    label: 'To receive',
    payout: PayoutStatus.PENDING,
    empty: 'Nothing waiting. Helpio has sent you everything customers paid.',
  },
  { value: EarningsTab.RECEIVED, label: 'Received', payout: PayoutStatus.PAID, empty: 'No payouts yet. Money Helpio sends you shows here.' },
];

const toRow = (item: EarningItem, onOpen: () => void): EarningRow => {
  const sent = item.payoutStatus === PayoutStatus.PAID;
  const method = paymentMethodLabel(item.method);
  return {
    id: item.paymentId,
    title: item.jobTitle,
    paidLabel: [item.paidAt ? `Paid ${formatShortDate(item.paidAt)}` : 'Paid', method].filter(Boolean).join(' · '),
    amount: item.amount,
    badge: sent ? { label: 'Received', tone: 'success' } : { label: 'Helpio is sending', tone: 'warning' },
    payoutNote: sent
      ? [item.payoutAt ? `Sent ${formatShortDate(item.payoutAt)}` : 'Sent', item.payoutReference && `Ref ${item.payoutReference}`]
          .filter(Boolean)
          .join(' · ')
      : null,
    onOpen,
  };
};

/** /pro/earnings: totals and paid jobs by payout state. The tab lives in `?tab=` so Back returns to it. */
const useEarnings = (): EarningsLayoutProps => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { data, error, isLoading, refetch } = useGetProviderEarningsQuery();

  if (isLoading) return { status: 'loading' };
  if (!data) return { status: 'error', message: apiErrorMessage(error), onRetry: refetch };

  const tab = TABS.find((t) => t.value === params.get('tab')) ?? TABS[0];
  const inTab = (t: (typeof TABS)[number]) => data.items.filter((item) => t.payout === null || item.payoutStatus === t.payout);

  return {
    status: 'ready',
    summary: { total: data.total, week: data.week, toReceive: data.toReceive, received: data.received },
    tab: tab.value,
    tabs: TABS.map((t) => {
      const count = inTab(t).length;
      return { value: t.value, label: count ? `${t.label} (${count})` : t.label };
    }),
    onTabChange: (value) => setParams({ tab: value }, { replace: true }),
    items: inTab(tab).map((item) => toRow(item, () => navigate(toPath(RouterKeys.PRO_JOB_DETAIL, { id: item.jobId })))),
    empty: {
      text: tab.empty,
      ...(tab.value === EarningsTab.ALL && { actionLabel: 'Find jobs near you', onAction: () => navigate(RouterKeys.PRO_JOBS) }),
    },
  };
};

const EarningsPage = () => (
  <SuspenseWrapper>
    <EarningsLayout {...useEarnings()} />
  </SuspenseWrapper>
);

export default EarningsPage;
