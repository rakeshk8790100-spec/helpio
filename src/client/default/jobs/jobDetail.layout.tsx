import { Button } from 'antd';
import { Hourglass, Pencil } from 'lucide-react';
import { QuoteCard } from '../../../component/marketplace';
import { InviteStatus } from '../../../common/CommonEnum';
import { AlertBanner, Avatar, EmptyState, PageSkeleton, SectionHeader, StatusBadge } from '../../../component/ui';
import type { BadgeTone } from '../../../component/ui';

const INVITE_BADGE: Record<InviteStatus, { label: string; tone: BadgeTone }> = {
  [InviteStatus.PENDING]: { label: 'Waiting', tone: 'warning' },
  [InviteStatus.QUOTED]: { label: 'Quoted', tone: 'success' },
  [InviteStatus.DECLINED]: { label: 'Declined', tone: 'neutral' },
};
import JobSummaryBlock from './jobSummary';
import type { JobDetailLayoutProps } from './jobs.layout.types';

/** /jobs/:id: the customer's job: details and photos, then quotes to compare (drafts: continue editing). */
const JobDetailLayout = (p: JobDetailLayoutProps) => {
  if (p.status === 'loading') return <PageSkeleton />;
  if (p.status === 'error') return <AlertBanner message={p.message} onRetry={p.onRetry} />;

  return (
    <div className="flex flex-col gap-6">
      <JobSummaryBlock summary={p.summary} onBack={p.onBack} backLabel="My jobs" />

      {p.draft && (
        <section className="rounded-2xl bg-indigo-50 p-4">
          <div className="text-sm font-semibold text-indigo-900">This job is a draft</div>
          <div className="mt-1 text-xs text-indigo-800">Pros can't see it until you post it.</div>
          <Button type="primary" block size="large" onClick={p.draft.onContinue} className="!mt-3">
            Continue editing
          </Button>
        </section>
      )}

      {p.edit && (
        <div className="-mt-2 flex flex-col gap-1.5">
          <Button size="large" block icon={<Pencil size={16} />} onClick={p.edit.onEdit}>
            Edit job
          </Button>
          {p.edit.hasQuotes && (
            <div className="text-center text-[11px] text-slate-500">Pros who already quoted will see your changes.</div>
          )}
        </div>
      )}

      {(p.invites.length > 0 || p.onFindPros) && (
        <section>
          <SectionHeader
            title={p.invites.length ? 'Pros you asked' : 'Ask a pro directly'}
            actionLabel={p.onFindPros ? 'Find pros' : undefined}
            onAction={p.onFindPros ?? undefined}
          />
          {p.invites.length ? (
            <div className="flex flex-col divide-y divide-slate-100 rounded-2xl border border-slate-100 shadow-sm">
              {p.invites.map(({ invite, onOpen }) => {
                const badge = INVITE_BADGE[invite.status];
                return (
                  <button key={invite.providerId} type="button" onClick={onOpen} className="flex items-center gap-3 p-3 text-left active:bg-slate-50">
                    <Avatar name={invite.providerLabel} src={invite.avatarUrl} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">{invite.providerLabel}</span>
                    <StatusBadge label={badge.label} tone={badge.tone} />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-slate-500">Pick a pro from Search and send them this job for a quote.</div>
          )}
        </section>
      )}

      {p.quotes && (
        <section>
          <SectionHeader title={p.quotes.items.length ? `Quotes (${p.quotes.items.length})` : 'Quotes'} />
          {p.quotes.items.length ? (
            <div className="flex flex-col gap-3">
              {p.quotes.items.map(({ quote, cheapest }) => (
                <QuoteCard key={quote.id} quote={quote} cheapest={cheapest} lockedNote={p.quotes?.lockedNote} />
              ))}
            </div>
          ) : (
            <EmptyState Icon={Hourglass} text="Your job is live. Pros nearby usually quote within minutes, and they show up here." />
          )}
        </section>
      )}
    </div>
  );
};

export default JobDetailLayout;
