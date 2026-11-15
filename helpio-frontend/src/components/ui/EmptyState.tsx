import type { LucideIcon } from 'lucide-react';

interface Props {
  Icon: LucideIcon;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Empty section: an icon, one helpful line and an optional action. */
const EmptyState = ({ Icon, text, actionLabel, onAction }: Props) => (
  <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center">
    <Icon size={24} className="text-slate-400" />
    <span className="text-sm text-slate-600">{text}</span>
    {actionLabel && (
      <button type="button" onClick={onAction} className="text-sm font-semibold text-indigo-600 active:scale-95">
        {actionLabel}
      </button>
    )}
  </div>
);

export default EmptyState;
