import { ChevronRight } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import type { BadgeTone } from '@/components/ui/StatusBadge';
import { formatINR } from '@/lib/utils';

interface Props {
  title: string;
  /** e.g. "Plumbing · Indiranagar" */
  meta: string;
  badge: { label: string; tone: BadgeTone };
  /** Shown on the right, e.g. the lowest quote */
  amount?: number | null;
  amountLabel?: string;
  urgent?: boolean;
  onClick: () => void;
}

/** One of the customer's jobs in a list: title, status and the number that matters next. */
const JobCard = ({ title, meta, badge, amount, amountLabel, urgent = false, onClick }: Props) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm active:scale-[.98]"
  >
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusBadge label={badge.label} tone={badge.tone} />
        {urgent && <StatusBadge label="Urgent" tone="error" />}
      </div>
      <div className="mt-1.5 truncate text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-0.5 truncate text-xs text-slate-500">{meta}</div>
    </div>
    {amount != null && (
      <div className="shrink-0 text-right">
        {amountLabel && <div className="text-[10px] text-slate-500">{amountLabel}</div>}
        <div className="text-sm font-bold text-slate-900">{formatINR(amount)}</div>
      </div>
    )}
    <ChevronRight size={16} className="shrink-0 text-slate-400" />
  </button>
);

export default JobCard;
