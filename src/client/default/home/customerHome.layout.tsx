import { Skeleton } from 'antd';
import { ClipboardList, Siren } from 'lucide-react';
import {
  ActiveJobCard,
  CategoryGrid,
  JobCard,
  PostJobComposer,
  SearchBox,
  ServiceCard,
} from '../../../component/marketplace';
import { AlertBanner, EmptyState, HScroll, SectionHeader } from '../../../component/ui';
import type { CustomerHomeLayoutProps, JobItem } from './home.layout.types';

const JobList = ({ title, items, actionLabel, onAction }: { title: string; items: JobItem[]; actionLabel?: string; onAction?: () => void }) =>
  items.length > 0 && (
    <section>
      <SectionHeader title={title} actionLabel={actionLabel} onAction={onAction} />
      <div className="flex flex-col gap-2">
        {items.map(({ id, ...card }) => (
          <JobCard key={id} {...card} />
        ))}
      </div>
    </section>
  );

/** Signed-in customer home: live job first, then quotes to decide on, jobs in flight, drafts, then discovery. */
const CustomerHomeLayout = (p: CustomerHomeLayoutProps) => {
  const { jobs } = p;
  const noJobs =
    jobs.status === 'ready' && !jobs.active && !jobs.decisions.length && !jobs.waiting.length && !jobs.drafts.length;

  return (
    <div className="flex flex-col gap-6">
      {/* ① Greeting and search */}
      <div className="-mx-5 -mt-5 bg-linear-to-b from-indigo-50 to-white px-5 pt-6">
        <div className="text-xl font-bold text-slate-900">Hi, {p.firstName}</div>
        <div className="mt-1 text-sm text-slate-600">What needs doing today?</div>
      </div>
      <SearchBox {...p.search} />

      {/* ② Jobs, by urgency */}
      {jobs.status === 'loading' && (
        <div className="rounded-2xl border border-slate-100 p-4">
          <Skeleton active paragraph={{ rows: 3 }} />
        </div>
      )}
      {jobs.status === 'error' && <AlertBanner message={jobs.message} onRetry={jobs.onRetry} />}
      {jobs.status === 'ready' && (
        <>
          {jobs.active && <ActiveJobCard {...jobs.active} />}
          <JobList title="Quotes to review" items={jobs.decisions} actionLabel="All jobs" onAction={jobs.onSeeAll} />
          <JobList title="Waiting for quotes" items={jobs.waiting} />
          <JobList title="Drafts" items={jobs.drafts} />
          {noJobs && (
            <EmptyState
              Icon={ClipboardList}
              text="No jobs yet. Post one and get quotes from verified pros nearby."
              actionLabel="Post a job"
              onAction={p.onPostJob}
            />
          )}
        </>
      )}

      {/* ③ Start something new */}
      <div className="flex flex-col gap-3">
        <PostJobComposer {...p.composer} />
        <button
          type="button"
          onClick={p.onEmergencyJob}
          className="flex h-10 items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 text-sm font-semibold text-red-600 active:scale-[.98]"
        >
          <Siren size={16} />
          Emergency? Get priority help
        </button>
      </div>

      {/* ④ Discovery */}
      <section>
        <SectionHeader title="Browse categories" />
        <CategoryGrid categories={p.categories.items} onSelect={p.categories.onSelect} onMore={p.categories.onMore} />
      </section>
      <section>
        <SectionHeader title="Popular services" actionLabel="See all" onAction={p.popular.onSeeAll} />
        <HScroll>
          {p.popular.items.map((s) => (
            <ServiceCard key={s.id} service={s} onBook={() => p.popular.onBook(s)} />
          ))}
        </HScroll>
      </section>
    </div>
  );
};

export default CustomerHomeLayout;
