import { Button } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { StatusBadge } from '@/components/ui';
import type { AdminCategory } from '@/pages/admin/types/admin.models';

type Skill = AdminCategory['skills'][number];

/** One category's services table, with Edit on each row. */
export const skillColumns = (onEdit: (skill: Skill) => void): ColumnsType<Skill> => [
  {
    title: 'Service',
    render: (_, s) => (
      <span className="flex items-center gap-2 text-sm text-slate-800">
        {s.name}
        {!s.isActive && <StatusBadge label="Off" tone="neutral" />}
      </span>
    ),
  },
  { title: 'Providers', width: 100, render: (_, s) => <span className="text-sm text-slate-700">{s.providers}</span> },
  { title: 'Order', width: 80, render: (_, s) => <span className="text-xs text-slate-500">{s.sortOrder}</span> },
  {
    title: '',
    width: 80,
    align: 'right',
    render: (_, s) => (
      <Button size="small" type="link" onClick={() => onEdit(s)}>
        Edit
      </Button>
    ),
  },
];
