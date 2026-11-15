import { Skeleton } from 'antd';
import { ClipboardList, Heart, Search, SearchX, Siren } from 'lucide-react';
import type { JobItem } from '@/common/JobDisplay';
import {
  ActiveJobCard,
  CategoryGrid,
  JobCard,
  PostJobComposer,
  ProviderCard,
} from '@/components/common';
import { AlertBanner, Chip, EmptyState, HScroll, SectionHeader } from '@/components/ui';
import type { CustomerHomeLayoutProps } from '@/pages/home/screens/customerHome/types/customerHome.dto';

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
  const { jobs, favorites } = p;
  const noJobs =
    jobs.status === 'ready' && !jobs.active && !jobs.decisions.length && !jobs.waiting.length && !jobs.drafts.length;

  return (
    <div className="flex flex-col gap-6">
      {/* ① Greeting and search */}
      <div className="-mx-5 -mt-5 bg-linear-to-b from-indigo-50 to-white px-5 pt-6">
        <h1 className="text-xl font-bold tracking-normal text-slate-900">Hi, {p.firstName}</h1>
        <div className="mt-1 text-sm text-slate-600">What needs doing today?</div>
      </div>
      <button
        type="button"
        onClick={p.onSearch}
        className="sticky -top-5 z-20 -mx-5 -mt-4 bg-white px-5 py-2 text-left"
        aria-label="Find a pro"
      >
        <span className="flex h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-400">
          <Search size={18} />
          Find a plumber, electrician, cleaner…
        </span>
      </button>

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
      {favorites?.kind === 'pick' && (
        <button
          type="button"
          onClick={favorites.onPick}
          className="flex items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50/60 p-4 text-left active:scale-[.98]"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-rose-500">
            <Heart size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-900">Pick your favourite services</span>
            <span className="block text-xs text-slate-600">We'll show pros near you who offer them, right here.</span>
          </span>
        </button>
      )}
      {favorites?.kind === 'pros' && (
        <section>
          <SectionHeader title="Available for your favourites" actionLabel="Edit" onAction={favorites.onEdit} />
          <div className="scrollbar-none -mx-5 mb-3 flex gap-2 overflow-x-auto px-5">
            {favorites.chips.map((chip) => (
              <Chip key={chip.value} active={chip.value === favorites.selected} onClick={() => favorites.onSelect(chip.value)}>
                {chip.label}
              </Chip>
            ))}
          </div>
          {favorites.results.status === 'loading' && <Skeleton active paragraph={{ rows: 2 }} />}
          {favorites.results.status === 'error' && (
            <AlertBanner message={favorites.results.message} onRetry={favorites.results.onRetry} />
          )}
          {favorites.results.status === 'ready' &&
            (favorites.results.items.length ? (
              <HScroll>
                {favorites.results.items.map(({ provider, onOpen }) => (
                  <ProviderCard key={provider.id} provider={provider} onOpen={onOpen} compact />
                ))}
              </HScroll>
            ) : (
              <EmptyState Icon={SearchX} text="No pros near you offer these yet. New pros join every week." />
            ))}
        </section>
      )}
      {p.pros && (
        <section>
          <SectionHeader title="Pros near you" actionLabel="See all" onAction={p.pros.onSeeAll} />
          <HScroll>
            {p.pros.items.map(({ provider, onOpen }) => (
              <ProviderCard key={provider.id} provider={provider} onOpen={onOpen} compact />
            ))}
          </HScroll>
        </section>
      )}
    </div>
  );
};

export default CustomerHomeLayout;
