import { Button, Segmented, Table } from 'antd';
import { CircleCheck } from 'lucide-react';
import { PageHeader } from '../../../component/admin';
import { AlertBanner, Avatar, EmptyState, PageSkeleton, StatusBadge } from '../../../component/ui';
import type { ApprovalFilter, ApprovalRow, ApprovalsLayoutProps } from './admin.layout.types';
import ReasonDialog from './reasonDialog';

/** /admin/approvals: new customers and providers waiting for an admin, oldest first. */
const ApprovalsLayout = (p: ApprovalsLayoutProps) => {
  if (p.status === 'loading') return <PageSkeleton />;
  if (p.status === 'error') return <AlertBanner message={p.message} onRetry={p.onRetry} />;

  return (
    <div>
      <PageHeader
        title="Approvals"
        description="New customers can log in, and new providers can quote and be found, once you approve them. They're told by email."
        actions={
          <Segmented<ApprovalFilter>
            value={p.filter.value}
            options={p.filter.options}
            onChange={p.filter.onChange}
            aria-label="Show"
          />
        }
      />
      {p.rows.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <EmptyState Icon={CircleCheck} text={p.emptyText} />
        </div>
      ) : (
        <Table<ApprovalRow>
          rowKey={(row) => row.item.id}
          dataSource={p.rows}
          pagination={false}
          className="rounded-2xl border border-slate-100 bg-white shadow-sm"
          columns={[
            {
              title: 'Person',
              render: (_, { item }) => (
                <span className="flex items-center gap-3">
                  <Avatar name={item.name ?? item.email} size="sm" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900">{item.name ?? item.email}</span>
                    <span className="block text-xs text-slate-500">{item.email}</span>
                  </span>
                </span>
              ),
            },
            {
              title: 'Role',
              width: 110,
              render: (_, row) => <StatusBadge label={row.roleLabel} tone={row.item.role === 'provider' ? 'brand' : 'neutral'} />,
            },
            { title: 'Mobile', width: 140, render: (_, { item }) => <span className="text-sm text-slate-700">{item.phone ?? '–'}</span> },
            {
              title: 'Details',
              render: (_, row) =>
                row.details.length ? (
                  <span className="flex flex-col gap-0.5 text-xs text-slate-600">
                    {row.details.map((line) => (
                      <span key={line}>{line}</span>
                    ))}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">–</span>
                ),
            },
            { title: 'Signed up', width: 170, render: (_, row) => <span className="text-xs text-slate-500">{row.signedUp}</span> },
            {
              title: '',
              width: 190,
              align: 'right',
              render: (_, row) => (
                <span className="flex justify-end gap-2">
                  <Button size="small" danger disabled={row.busy} onClick={row.onReject}>
                    Reject
                  </Button>
                  <Button size="small" type="primary" loading={row.busy} onClick={row.onApprove}>
                    Approve
                  </Button>
                </span>
              ),
            },
          ]}
        />
      )}
      {p.dialog && <ReasonDialog {...p.dialog} />}
    </div>
  );
};

export default ApprovalsLayout;
