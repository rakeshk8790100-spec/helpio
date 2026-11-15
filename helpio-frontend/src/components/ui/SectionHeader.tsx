import { ChevronRight } from 'lucide-react';

interface Props {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

const SectionHeader = ({ title, actionLabel, onAction }: Props) => (
  <div className="mb-3 flex items-center justify-between">
    <h2 className="text-base font-semibold tracking-normal text-slate-900">{title}</h2>
    {actionLabel && (
      <button
        type="button"
        onClick={onAction}
        className="flex items-center gap-0.5 text-xs font-medium text-indigo-600"
      >
        {actionLabel}
        <ChevronRight size={14} />
      </button>
    )}
  </div>
);

export default SectionHeader;
