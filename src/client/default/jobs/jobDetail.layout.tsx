import { Button } from 'antd';
import { Hourglass } from 'lucide-react';
import { QuoteCard } from '../../../component/marketplace';
import { AlertBanner, EmptyState, PageSkeleton, SectionHeader } from '../../../component/ui';
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
