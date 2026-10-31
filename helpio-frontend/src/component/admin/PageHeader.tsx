import type { ReactNode } from 'react';

interface Props {
  title: string;
  /** One line under the title: what the page is for */
  description?: string;
  /** Buttons or filters on the right */
  actions?: ReactNode;
}

/** Admin console page title, with an optional description and actions. */
const PageHeader = ({ title, description, actions }: Props) => (
  <div className="mb-6 flex items-end justify-between gap-4">
    <div className="min-w-0">
      <div className="text-2xl font-bold text-slate-900">{title}</div>
      {description && <div className="mt-1 text-sm text-slate-500">{description}</div>}
    </div>
    {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
  </div>
);

export default PageHeader;
