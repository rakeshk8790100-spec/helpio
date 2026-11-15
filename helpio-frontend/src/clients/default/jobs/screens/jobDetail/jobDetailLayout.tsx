import { Button, Popconfirm } from 'antd';
import { CirclePlay, Hourglass, MessageCircle, Pencil } from 'lucide-react';
import { InviteStatus } from '@/common/CommonEnum';
import { QuoteCard } from '@/components/common';
import { AlertBanner, Avatar, EmptyState, PageSkeleton, SectionHeader, StatusBadge } from '@/components/ui';
import type { BadgeTone } from '@/components/ui';
import { formatINR } from '@/lib/utils';

const INVITE_BADGE: Record<InviteStatus, { label: string; tone: BadgeTone }> = {
  [InviteStatus.PENDING]: { label: 'Waiting', tone: 'warning' },
  [InviteStatus.QUOTED]: { label: 'Quoted', tone: 'success' },
  [InviteStatus.DECLINED]: { label: 'Declined', tone: 'neutral' },
};
import JobPaymentBlock from '@/clients/default/jobs/shared/jobPayment';
import JobProgressBlock from '@/clients/default/jobs/shared/jobProgress';
import JobReviewBlock from '@/clients/default/jobs/shared/jobReview';
import JobSummaryBlock from '@/clients/default/jobs/shared/jobSummary';
import type { JobDetailLayoutProps } from '@/pages/jobs/screens/jobDetail/types/jobDetail.dto';

/** /jobs/:id: the customer's job: details and photos, then quotes to compare (drafts: continue editing). */
const JobDetailLayout = (p: JobDetailLayoutProps) => {
  if (p.status === 'loading') return <PageSkeleton />;
  if (p.status === 'error') return <AlertBanner message={p.message} onRetry={p.onRetry} />;

  return (
    <div className="flex flex-col gap-6">
      <JobSummaryBlock summary={p.summary} onBack={p.onBack} backLabel="My jobs" />

      {p.hired && (
        <section className="rounded-2xl bg-linear-to-br from-indigo-500 to-violet-500 p-4 text-white shadow-lg shadow-indigo-500/25">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-white/70">Your pro</div>
          <button type="button" onClick={p.hired.onOpen} className="mt-2 flex w-full items-center gap-3 text-left active:scale-[.98]">
            <Avatar name={p.hired.pro.providerLabel} src={p.hired.pro.avatarUrl} size="md" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base font-semibold">{p.hired.pro.providerLabel}</span>
              <span className="block text-xs text-white/80">Hired for {formatINR(p.hired.pro.amount)}</span>
            </span>
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold">Pro hired</span>
          </button>
          {p.hired.pin && (
            <div className="mt-4 rounded-xl bg-white/15 p-3 text-center">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-white/70">Start PIN</div>
              {p.hired.pin.locked ? (
                <>
                  <div role="alert" className="mt-1 text-sm font-semibold">
                    Your pro entered a wrong PIN too many times.
                  </div>
                  <button
                    type="button"
                    onClick={p.hired.pin.onReset}
                    disabled={p.hired.pin.resetting}
                    className="mt-3 h-10 w-full rounded-xl bg-white text-sm font-semibold text-indigo-700 active:scale-[.98] disabled:opacity-60"
                  >
                    {p.hired.pin.resetting ? 'Getting a new PIN…' : 'Get a new PIN and share it at the door'}
                  </button>
                </>
              ) : (
                <>
                  <div className="mt-1 font-mono text-3xl font-bold tracking-[0.3em]" aria-label={`Start PIN ${p.hired.pin.value.split('').join(' ')}`}>
                    {p.hired.pin.value}
                  </div>
                  <button
                    type="button"
                    onClick={p.hired.pin.onReset}
                    disabled={p.hired.pin.resetting}
                    className="mt-1 text-[11px] font-medium text-white/80 underline disabled:opacity-60"
                  >
                    {p.hired.pin.resetting ? 'Getting a new PIN…' : 'Get a new PIN'}
                  </button>
                </>
              )}
            </div>
          )}
          {p.hired.startedLabel && (
            <div className="mt-3 flex items-center gap-2 text-sm font-semibold">
              <CirclePlay size={16} />
              {p.hired.startedLabel}
            </div>
          )}
          <div className="mt-3 text-xs text-white/80">{p.hired.nextStep}</div>
          <button
            type="button"
            onClick={p.hired.chat.onOpen}
            className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-indigo-700 active:scale-[.98]"
          >
            <MessageCircle size={16} />
            Chat with {p.hired.pro.providerLabel}
            {p.hired.chat.unread > 0 && (
              <span className="rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{p.hired.chat.unread}</span>
            )}
          </button>
        </section>
      )}

      {p.payment && <JobPaymentBlock payment={p.payment} />}
      {p.review && <JobReviewBlock review={p.review} />}

      {p.progress && <JobProgressBlock progress={p.progress} />}

      {p.draft && (
        <section className="rounded-2xl bg-indigo-50 p-4">
          <div className="text-sm font-semibold text-indigo-900">This job is a draft</div>
          <div className="mt-1 text-xs text-indigo-800">Pros can't see it until you post it.</div>
          <Button type="primary" block size="large" onClick={p.draft.onContinue} className="!mt-3">
            Continue editing
          </Button>
          <Popconfirm
            title="Delete this draft?"
            description="Its details and photos are removed."
            okText="Delete"
            okButtonProps={{ danger: true }}
            cancelText="Keep"
            onConfirm={p.draft.onDelete}
          >
            <Button type="text" danger block loading={p.draft.deleting} className="!mt-1">
              Delete draft
            </Button>
          </Popconfirm>
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
              {p.quotes.items.map(({ quote, cheapest, onOpenPro, onAccept, onReject, acting }) => (
                <QuoteCard
                  key={quote.id}
                  quote={quote}
                  cheapest={cheapest}
                  onOpenPro={onOpenPro}
                  onAccept={onAccept}
                  onReject={onReject}
                  acting={acting}
                  disabled={Boolean(p.quotes?.busy)}
                />
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
