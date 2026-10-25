import { Segmented, Skeleton } from 'antd';
import { ClipboardList, Plus } from 'lucide-react';
import { JobCard } from '../../../component/marketplace';
import { AlertBanner, EmptyState } from '../../../component/ui';
import type { MyJobsLayoutProps } from './jobs.layout.types';

/** /jobs: the customer's jobs by stage, newest activity first. */
const MyJobsLayout = (p: MyJobsLayoutProps) => (
  <div className="flex flex-col gap-4">
    <div className="flex items-center justify-between">
      <div className="text-xl font-bold text-slate-900">My jobs</div>
      <button
        type="button"
        onClick={p.onPostJob}
        className="flex h-10 items-center gap-1 rounded-xl bg-indigo-600 px-3 text-sm font-semibold text-white active:scale-95"
      >
        <Plus size={16} />
        Post a job
      </button>
    </div>

    <div className="sticky -top-5 z-10 -mx-5 bg-white px-5 py-2">
      <Segmented block value={p.tab} options={p.tabs} onChange={p.onTabChange} />
    </div>

    {p.jobs.status === 'loading' && <Skeleton active paragraph={{ rows: 4 }} />}
    {p.jobs.status === 'error' && <AlertBanner message={p.jobs.message} onRetry={p.jobs.onRetry} />}
    {p.jobs.status === 'ready' &&
      (p.jobs.items.length ? (
        <div className="flex flex-col gap-2">
          {p.jobs.items.map(({ id, ...card }) => (
            <JobCard key={id} {...card} />
          ))}
        </div>
      ) : (
        <EmptyState Icon={ClipboardList} text={p.jobs.emptyText} />
      ))}
  </div>
);

export default MyJobsLayout;
