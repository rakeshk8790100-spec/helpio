import { Select, Table } from 'antd';
import { PageHeader } from '../../../component/admin';
import { AlertBanner, StatusBadge } from '../../../component/ui';
import type { AuditLogLayoutProps } from './admin.layout.types';

type Row = Extract<AuditLogLayoutProps['entries'], { status: 'ready' }>['rows'][number];

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
      <Table<Row>
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
        columns={[
          { title: 'When', width: 160, render: (_, row) => <span className="text-xs text-slate-500">{row.when}</span> },
          { title: 'Who', width: 200, render: (_, row) => <span className="text-sm text-slate-800">{row.actor ?? 'System'}</span> },
          { title: 'Action', width: 170, render: (_, row) => <StatusBadge label={row.actionLabel} tone={row.tone} /> },
          { title: 'What happened', render: (_, row) => <span className="text-sm text-slate-700">{row.summary}</span> },
          { title: 'IP', width: 130, render: (_, row) => <span className="font-mono text-xs text-slate-500">{row.ip ?? '–'}</span> },
        ]}
      />
    )}
  </div>
);

export default AuditLogLayout;
