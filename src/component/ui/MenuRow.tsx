import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Props {
  Icon: LucideIcon;
  label: string;
  /** Second line, e.g. the current value */
  hint?: string;
  onClick?: () => void;
  /** Replaces the chevron, e.g. a badge */
  trailing?: ReactNode;
  tone?: 'default' | 'danger';
  disabled?: boolean;
}

/** One tappable settings row: icon, label, optional hint and a chevron. Stack inside a rounded card. */
const MenuRow = ({ Icon, label, hint, onClick, trailing, tone = 'default', disabled = false }: Props) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left active:bg-slate-50 disabled:opacity-60"
  >
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
        tone === 'danger' ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'
      }`}
    >
      <Icon size={18} />
    </span>
    <span className="min-w-0 flex-1">
      <span className={`block text-sm font-medium ${tone === 'danger' ? 'text-red-600' : 'text-slate-900'}`}>{label}</span>
      {hint && <span className="block truncate text-xs text-slate-500">{hint}</span>}
    </span>
    {trailing ?? (onClick && tone !== 'danger' && <ChevronRight size={16} className="shrink-0 text-slate-400" />)}
  </button>
);

export default MenuRow;
