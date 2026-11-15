import type { ColumnsType } from 'antd/es/table';
import type { ErrorRow } from './types/systemStatus.dto';

/** The systemStatus table: what each column shows for a row. */
export const systemStatusColumns: ColumnsType<ErrorRow> = [
  { title: 'Last seen', width: 160, render: (_, row) => <span className="text-xs text-slate-500">{row.when}</span> },
  { title: 'Times', width: 70, render: (_, row) => <span className="text-sm font-semibold text-slate-900">{row.count}</span> },
  { title: 'Request', width: 320, render: (_, row) => <span className="font-mono text-xs text-slate-700">{row.route}</span> },
  {
    title: 'Error',
    render: (_, row) => (
      <span className="flex flex-col">
        <span className="text-xs font-semibold text-red-700">{row.errorType}</span>
        <span className="line-clamp-2 text-xs text-slate-600">{row.message}</span>
      </span>
    ),
  },
];
