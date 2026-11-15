import { Button, Select, Skeleton } from 'antd';
import { LocateFixed, MapPin, MapPinned, Search, UsersRound } from 'lucide-react';
import { ProviderCard } from '../../../component/marketplace';
import { AlertBanner, Chip, EmptyState } from '../../../component/ui';
import type { ProviderSearchLayoutProps } from './pros.layout.types';

/** /search: find pros who serve your address by skill or category, then open a profile. */
const ProviderSearchLayout = (p: ProviderSearchLayoutProps) => (
  <div className="flex flex-col gap-4">
    <div>
      <div className="text-xl font-bold text-slate-900">Find a pro</div>
      <div className="mt-1 text-sm text-slate-600">Verified pros who work in your area. Open one to see their skills and ask for a quote.</div>
    </div>

    {/* Search, place and categories */}
    <div className="sticky -top-5 z-20 -mx-5 flex flex-col gap-2 bg-white px-5 py-2">
      <label className="flex h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 focus-within:border-indigo-400 focus-within:bg-white">
        <Search size={18} className="text-slate-400" />
        <input
          type="search"
          value={p.query}
          onChange={(e) => p.onQueryChange(e.target.value)}
          placeholder="Plumber, AC repair, painting…"
          aria-label="Search pros by skill"
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
      </label>
      {p.places.length > 0 && (
        <div className="flex items-center gap-2">
          <MapPin size={14} className="shrink-0 text-indigo-500" />
          <span className="text-xs text-slate-500">Near</span>
          <Select
            size="small"
            variant="borderless"
            value={p.place}
            onChange={p.onPlaceChange}
            options={p.places}
            loading={p.locating}
            popupMatchSelectWidth={false}
            aria-label="Search near"
            className="min-w-0 flex-1 !font-medium"
          />
        </div>
      )}
      <div className="scrollbar-none -mx-5 flex gap-2 overflow-x-auto px-5">
        {p.categories.map((c) => (
          <Chip key={c.value} active={c.value === p.categoryId} onClick={() => p.onCategoryChange(c.value)}>
            {c.label}
          </Chip>
        ))}
      </div>
    </div>

    {p.needsLocation && (
      <section className="flex flex-col items-center gap-3 rounded-2xl bg-indigo-50 p-5 text-center">
        <MapPinned size={28} className="text-indigo-500" />
        <div className="text-sm font-semibold text-indigo-900">Where do you need help?</div>
        <div className="text-xs text-indigo-800">We only show pros who travel to your area.</div>
        {p.needsLocation.error && <div className="text-xs text-red-600">{p.needsLocation.error}</div>}
        <div className="grid w-full grid-cols-2 gap-2">
          <Button size="large" icon={<LocateFixed size={16} />} loading={p.locating} onClick={p.needsLocation.onUseCurrent}>
            Use my location
          </Button>
          <Button type="primary" size="large" onClick={p.needsLocation.onAddAddress}>
            Add address
          </Button>
        </div>
      </section>
    )}

    {p.results?.status === 'loading' && <Skeleton active avatar paragraph={{ rows: 3 }} />}
    {p.results?.status === 'error' && <AlertBanner message={p.results.message} onRetry={p.results.onRetry} />}
    {p.results?.status === 'ready' &&
      (p.results.items.length ? (
        <div className="flex flex-col gap-3">
          <div role="status" className="text-xs text-slate-500">
            {p.results.total} pro{p.results.total === 1 ? '' : 's'}
            {p.results.near ? ` serving ${p.results.near}` : ' near you'}
          </div>
          {p.results.items.map(({ provider, onOpen }) => (
            <ProviderCard key={provider.id} provider={provider} onOpen={onOpen} />
          ))}
          {p.results.hasMore && (
            <Button size="large" block loading={p.results.loadingMore} onClick={p.results.onLoadMore}>
              Show more pros
            </Button>
          )}
        </div>
      ) : (
        <EmptyState
          Icon={UsersRound}
          text="No pros match here yet. Post a job and pros nearby will send you quotes."
          actionLabel="Post a job"
          onAction={p.results.onPostJob}
        />
      ))}
  </div>
);

export default ProviderSearchLayout;
