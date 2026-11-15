import { Select, Table } from 'antd';
import { PageHeader } from '@/components/admin';
import { AlertBanner } from '@/components/ui';
import type { AuditLogLayoutProps, AuditRow } from '@/pages/admin/screens/auditLog/types/auditLog.dto';

/** /admin/audit: every admin action and console log-in, newest first. */
const AuditLogLayout = (p: AuditLogLayoutProps) => (
  <div>
    <PageHeader
      title="Audit log"
      description="Who did what in the console, and every log-in attempt. Secret values are never recorded."
      actions={
        <Select
          allowClear
          placeholder="All actions"
          value={p.filter.value}
          onChange={(value) => p.filter.onChange(value ?? null)}
          options={p.filter.options}
          className="w-56"
          aria-label="Filter by action"
        />
      }
    />
    {p.entries.status === 'error' ? (
      <AlertBanner message={p.entries.message} onRetry={p.entries.onRetry} />
    ) : (
      <Table<AuditRow>
        rowKey="id"
        loading={p.entries.status === 'loading' || p.entries.fetching}
        dataSource={p.entries.status === 'ready' ? p.entries.rows : []}
        className="rounded-2xl border border-slate-100 bg-white shadow-sm"
        pagination={
          p.entries.status === 'ready' && {
            current: p.entries.page,
            pageSize: p.entries.pageSize,
            total: p.entries.total,
            showSizeChanger: false,
            onChange: p.entries.onPageChange,
          }
        }
        columns={p.columns}
      />
    )}
  </div>
);

export default AuditLogLayout;
