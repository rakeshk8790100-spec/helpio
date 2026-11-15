import { Segmented, Table } from 'antd';
import { CircleCheck } from 'lucide-react';
import ReasonDialog from '@/clients/default/admin/shared/reasonDialog';
import { PageHeader } from '@/components/admin';
import { AlertBanner, EmptyState, PageSkeleton } from '@/components/ui';
import type { ApprovalFilter, ApprovalRow, ApprovalsLayoutProps } from '@/pages/admin/screens/approvals/types/approvals.dto';

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
          columns={p.columns}
        />
      )}
      {p.dialog && <ReasonDialog {...p.dialog} />}
    </div>
  );
};

export default ApprovalsLayout;
