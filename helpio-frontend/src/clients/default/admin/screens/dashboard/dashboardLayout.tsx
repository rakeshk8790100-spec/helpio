import { CircleAlert, CircleCheck, History } from 'lucide-react';
import { KpiCard, PageHeader } from '@/components/admin';
import { AlertBanner, EmptyState, PageSkeleton } from '@/components/ui';
import type { DashboardLayoutProps } from '@/pages/admin/screens/dashboard/types/dashboard.dto';

/** /admin: Helpio today (India time), whether everything is running, and the latest activity. */
const DashboardLayout = (p: DashboardLayoutProps) => {
  if (p.status === 'loading') return <PageSkeleton />;
  if (p.status === 'error') return <AlertBanner message={p.message} onRetry={p.onRetry} />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Dashboard" description="Helpio today (India time). Tap a number to open the page behind it." />

      {p.health && (
        <button
          type="button"
          onClick={p.health.onOpen}
          className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium active:scale-[.99] ${
            p.health.ok ? 'border-emerald-100 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'
          }`}
        >
          {p.health.ok ? <CircleCheck size={18} /> : <CircleAlert size={18} />}
          <span className="flex-1">{p.health.text}</span>
          <span className="text-xs font-semibold underline">System status</span>
        </button>
      )}

      <div className="grid grid-cols-4 gap-3">
        {p.kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="mb-3 text-base font-semibold text-slate-900">Jobs by stage</div>
          <ul className="flex flex-col divide-y divide-slate-100">
            {p.jobs.map((row) => (
              <li key={row.label} className="flex items-center justify-between py-2 text-sm">
                <span className="text-slate-700">{row.label}</span>
                <span className="font-semibold text-slate-900">{row.count}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="col-span-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="mb-3 text-base font-semibold text-slate-900">Latest activity</div>
          {p.activity.length ? (
            <ol className="flex flex-col">
              {p.activity.map((item, index) => (
                <li key={item.id} className="flex gap-3">
                  <span className="flex flex-col items-center">
                    <span className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <History size={11} />
                    </span>
                    {index < p.activity.length - 1 && <span className="w-px flex-1 bg-slate-200" />}
                  </span>
                  <span className="min-w-0 flex-1 pb-3">
                    <span className="block text-sm text-slate-800">{item.text}</span>
                    <span className="block text-[11px] text-slate-500">
                      {item.jobTitle} · {item.when}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState Icon={History} text="Nothing yet. Hires, progress updates and payments show up here." />
          )}
        </section>
      </div>
    </div>
  );
};

export default DashboardLayout;
