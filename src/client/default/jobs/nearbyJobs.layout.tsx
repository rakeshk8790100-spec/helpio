import { Segmented, Skeleton } from 'antd';
import { List, Map as MapIcon, MapPinOff, SearchX, Siren, Wallet } from 'lucide-react';
import { JobMap, NearbyJobCard } from '../../../component/marketplace';
import { AlertBanner, Chip, EmptyState } from '../../../component/ui';
import { JobsView } from './jobs.layout.types';
import type { NearbyJobsLayoutProps } from './jobs.layout.types';

const VIEW_OPTIONS = [
  { value: JobsView.LIST, label: <span className="flex items-center justify-center gap-1"><List size={14} />List</span> },
  { value: JobsView.MAP, label: <span className="flex items-center justify-center gap-1"><MapIcon size={14} />Map</span> },
];

/** /pro/jobs: filters, then nearby jobs as cards or approximate circles on a map. */
const NearbyJobsLayout = (p: NearbyJobsLayoutProps) => {
  const f = p.filters;
  const r = p.results;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-600">For professionals</div>
        <div className="text-xl font-bold text-slate-900">Jobs near you</div>
      </div>

      {/* Filters */}
      <div className="sticky -top-5 z-[1000] -mx-5 flex flex-col gap-2 bg-white px-5 py-2">
        <div className="scrollbar-none -mx-5 flex gap-2 overflow-x-auto px-5">
          {f.categories.map((c) => (
            <Chip key={c.value} active={c.value === f.categoryId} onClick={() => f.onCategoryChange(c.value)}>
              {c.label}
            </Chip>
          ))}
        </div>
        <div className="scrollbar-none -mx-5 flex gap-2 overflow-x-auto px-5">
          {f.distances.map((d) => (
            <Chip key={d.value} active={d.value === f.maxKm} onClick={() => f.onMaxKmChange(d.value)}>
              {d.label}
            </Chip>
          ))}
          <Chip active={f.hasBudget} icon={<Wallet size={12} />} onClick={() => f.onHasBudgetChange(!f.hasBudget)}>
            Has budget
          </Chip>
          <Chip active={f.urgentOnly} icon={<Siren size={12} />} onClick={() => f.onUrgentOnlyChange(!f.urgentOnly)}>
            Urgent
          </Chip>
        </div>
        <Segmented block value={p.view} options={VIEW_OPTIONS} onChange={p.onViewChange} />
      </div>

      {r.status === 'loading' && <Skeleton active paragraph={{ rows: 5 }} />}
      {r.status === 'error' && <AlertBanner message={r.message} onRetry={r.onRetry} />}
      {r.status === 'ready' && p.view === JobsView.LIST && (
        r.items.length ? (
          <div className="flex flex-col gap-2">
            {r.items.map(({ job, onOpen }) => (
              <NearbyJobCard key={job.id} job={job} onOpen={onOpen} />
            ))}
          </div>
        ) : (
          <EmptyState Icon={SearchX} text="No open jobs match. Try fewer filters; new jobs show up here first." />
        )
      )}
      {r.status === 'ready' && p.view === JobsView.MAP && (
        r.noLocation ? (
          <EmptyState
            Icon={MapPinOff}
            text="Add your current location to see jobs on the map. You're matched by pincode until then."
            actionLabel="Add your location"
            onAction={r.noLocation.onAddLocation}
          />
        ) : (
          <div className="flex flex-col gap-2">
            <JobMap area={r.map.area} jobs={r.map.jobs} height={420} />
            <div className="text-[11px] text-slate-500">
              Circles show each job's approximate area. The exact address is shared only after you're hired.
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default NearbyJobsLayout;
