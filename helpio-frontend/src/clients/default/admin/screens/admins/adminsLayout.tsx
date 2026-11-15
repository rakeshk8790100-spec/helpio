import { Table } from 'antd';
import ReasonDialog from '@/clients/default/admin/shared/reasonDialog';
import { PageHeader } from '@/components/admin';
import { AlertBanner, PageSkeleton } from '@/components/ui';
import type { AdminRow, AdminsLayoutProps } from '@/pages/admin/screens/admins/types/admins.dto';

/** /admin/admins (owner): access requests to answer, and every admin's state. */
const AdminsLayout = (p: AdminsLayoutProps) => {
  if (p.status === 'loading') return <PageSkeleton />;
  if (p.status === 'error') return <AlertBanner message={p.message} onRetry={p.onRetry} />;

  return (
    <div>
      <PageHeader
        title="Admins"
        description={
          p.pendingCount
            ? `${p.pendingCount} access request${p.pendingCount === 1 ? '' : 's'} waiting for you.`
            : 'Everyone who can use the admin console. New admins ask for access and wait for you.'
        }
      />
      <Table<AdminRow>
        rowKey={(row) => row.admin.id}
        dataSource={p.rows}
        pagination={false}
        className="rounded-2xl border border-slate-100 bg-white shadow-sm"
        columns={p.columns}
      />
      {p.dialog && <ReasonDialog {...p.dialog} />}
    </div>
  );
};

export default AdminsLayout;
