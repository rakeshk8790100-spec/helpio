import { Button, Table } from 'antd';
import { CircleAlert, CircleCheck, RefreshCw } from 'lucide-react';
import { KpiCard, PageHeader } from '@/components/admin';
import { AlertBanner, EmptyState, PageSkeleton, StatusBadge } from '@/components/ui';
import type { StatusLayoutProps, ErrorRow } from '@/pages/admin/screens/systemStatus/types/systemStatus.dto';
import type { HealthRow } from '@/pages/admin/types/admin.models';

const HealthCard = ({ row }: { row: HealthRow }) => (
  <div className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm font-semibold text-slate-900">{row.label}</span>
      <StatusBadge label={row.badge.label} tone={row.badge.tone} />
    </div>
    <div className="text-xs text-slate-600">{row.message}</div>
    {row.meta && <div className="text-[11px] text-slate-500">{row.meta}</div>}
  </div>
);

/** /admin/status: is everything running? Outside services, background jobs, what's waiting and server errors. */
const SystemStatusLayout = (p: StatusLayoutProps) => {
  if (p.status === 'loading') return <PageSkeleton />;
  if (p.status === 'error') return <AlertBanner message={p.message} onRetry={p.onRetry} />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="System status"
        description={p.updatedLabel}
        actions={
          <Button icon={<RefreshCw size={14} />} loading={p.refreshing} onClick={p.onRefresh}>
            Check now
          </Button>
        }
      />

      <div
        role="status"
        className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold ${
          p.summary.ok ? 'border-emerald-100 bg-emerald-50 text-emerald-800' : 'border-red-100 bg-red-50 text-red-700'
        }`}
      >
        {p.summary.ok ? <CircleCheck size={18} /> : <CircleAlert size={18} />}
        {p.summary.text}
      </div>

      <section>
        <div className="mb-3 text-base font-semibold text-slate-900">Services</div>
        <div className="grid grid-cols-3 gap-3">
          {p.services.map((row) => (
            <HealthCard key={row.name} row={row} />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 text-base font-semibold text-slate-900">Background work</div>
        <div className="grid grid-cols-4 gap-3">
          {p.background.map((row) => (
            <HealthCard key={row.name} row={row} />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 text-base font-semibold text-slate-900">Waiting for an admin</div>
        <div className="grid grid-cols-3 gap-3">
          {p.attention.map((kpi) => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 text-base font-semibold text-slate-900">Server errors</div>
        {p.errors.length ? (
          <Table<ErrorRow>
            rowKey="id"
            dataSource={p.errors}
            pagination={false}
            size="small"
            className="rounded-2xl border border-slate-100 bg-white shadow-sm"
            columns={p.columns}
          />
        ) : (
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <EmptyState Icon={CircleCheck} text="No server errors since the log began." />
          </div>
        )}
      </section>

      <div className="text-xs text-slate-500">{p.app}</div>
    </div>
  );
};

export default SystemStatusLayout;
