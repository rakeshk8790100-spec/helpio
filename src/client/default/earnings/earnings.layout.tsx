import { Segmented } from 'antd';
import { ChevronRight, Landmark, Wallet } from 'lucide-react';
import { AlertBanner, EmptyState, PageSkeleton, StatTile, StatusBadge } from '../../../component/ui';
import { formatINR } from '../../../lib/utils';
import type { EarningRow, EarningsLayoutProps } from './earnings.layout.types';

/** One paid job: title, when it was paid, the amount and where Helpio's payout stands. */
const EarningCard = ({ row }: { row: EarningRow }) => (
  <button
    type="button"
    onClick={row.onOpen}
    className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm active:scale-[.98]"
  >
    <div className="min-w-0 flex-1">
      <div className="line-clamp-2 text-sm font-semibold text-slate-900">{row.title}</div>
      <div className="mt-0.5 text-xs text-slate-500">{row.paidLabel}</div>
      {row.payoutNote && <div className="mt-0.5 truncate text-xs text-slate-500">{row.payoutNote}</div>}
    </div>
    <div className="flex shrink-0 flex-col items-end gap-1">
      <span className="text-sm font-bold text-slate-900">{formatINR(row.amount)}</span>
      <StatusBadge label={row.badge.label} tone={row.badge.tone} />
    </div>
    <ChevronRight size={16} className="shrink-0 text-slate-400" />
  </button>
);

/** /pro/earnings: totals, how payouts work, then every paid job by payout state. */
const EarningsLayout = (p: EarningsLayoutProps) => {
  if (p.status === 'loading') return <PageSkeleton />;
  if (p.status === 'error') return <AlertBanner message={p.message} onRetry={p.onRetry} />;

  return (
    <div className="flex flex-col gap-4">
      {/* ① Dark "for professionals" header with the totals */}
      <div className="-mx-5 -mt-5 bg-slate-900 px-5 pb-5 pt-6 text-white">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">For professionals</div>
        <div className="mt-1 text-xl font-bold">Earnings</div>
        <div className="mt-4 text-xs text-white/70">Total earned on Helpio</div>
        <div className="text-3xl font-bold">{formatINR(p.summary.total)}</div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <StatTile variant="glass" label="This week" value={formatINR(p.summary.week)} />
          <StatTile variant="glass" label="To receive" value={formatINR(p.summary.toReceive)} />
          <StatTile variant="glass" label="Received" value={formatINR(p.summary.received)} />
        </div>
      </div>

      {/* ② How the money reaches the pro */}
      <div className="flex gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
        <Landmark size={16} className="mt-0.5 shrink-0 text-slate-500" />
        <span>
          The customer pays on Razorpay once all four stages are approved. Helpio then sends the money to you by UPI or
          bank transfer, and the reference shows here.
        </span>
      </div>

      {/* ③ Payout state */}
      <div className="sticky -top-5 z-10 -mx-5 bg-white px-5 py-2">
        <Segmented block value={p.tab} options={p.tabs} onChange={p.onTabChange} />
      </div>

      {/* ④ Paid jobs */}
      {p.items.length ? (
        <div className="flex flex-col gap-2">
          {p.items.map((row) => (
            <EarningCard key={row.id} row={row} />
          ))}
        </div>
      ) : (
        <EmptyState Icon={Wallet} {...p.empty} />
      )}
    </div>
  );
};

export default EarningsLayout;
