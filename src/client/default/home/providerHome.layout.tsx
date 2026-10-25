import { MapPinned } from 'lucide-react';
import { ActiveJobCard, ChecklistCard, NearbyJobCard } from '../../../component/marketplace';
import { AlertBanner, EmptyState, PageSkeleton, SectionHeader, StatTile } from '../../../component/ui';
import { formatINR } from '../../../lib/utils';
import type { ProviderHomeLayoutProps } from './home.layout.types';

/** Signed-in provider home: earnings at a glance, unfinished sign-up, the live job, then nearby jobs to quote on. */
const ProviderHomeLayout = (p: ProviderHomeLayoutProps) => {
  if (p.status === 'loading') return <PageSkeleton />;
  if (p.status === 'error') return <AlertBanner message={p.message} onRetry={p.onRetry} />;

  return (
    <div className="flex flex-col gap-6">
      {/* ① Dark "for professionals" header with today's numbers */}
      <div className="-mx-5 -mt-5 bg-slate-900 px-5 pb-5 pt-6 text-white">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">For professionals</div>
        <div className="mt-1 text-xl font-bold">Hi, {p.firstName}</div>
        <div className="mt-1 text-sm text-white/70">Here's your work at a glance.</div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <StatTile variant="glass" label="This week" value={formatINR(p.earnings.week)} />
          <StatTile variant="glass" label="Wallet" value={formatINR(p.earnings.wallet)} />
          <StatTile variant="glass" label="Quotes pending" value={p.pendingQuotes} />
        </div>
      </div>

      {/* ② Unfinished sign-up and verification */}
      {p.checklist && <ChecklistCard title="Get verified" {...p.checklist} />}

      {/* ③ Live job */}
      {p.active && <ActiveJobCard {...p.active} />}

      {/* ④ Nearby jobs */}
      <section>
        <SectionHeader
          title="Jobs near you"
          actionLabel={p.nearby.total > p.nearby.items.length ? `See all ${p.nearby.total}` : undefined}
          onAction={p.nearby.onSeeAll}
        />
        {p.nearby.items.length ? (
          <div className="flex flex-col gap-2">
            {p.nearby.items.map(({ job, onOpen }) => (
              <NearbyJobCard key={job.id} job={job} onOpen={onOpen} />
            ))}
          </div>
        ) : (
          <EmptyState Icon={MapPinned} text="No open jobs in your area right now. New ones show up here first." />
        )}
      </section>
    </div>
  );
};

export default ProviderHomeLayout;
