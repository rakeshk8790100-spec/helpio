import { MapPin, MessageCircle, UserRound } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import type { BadgeTone } from '@/components/ui/StatusBadge';
import { formatINR } from '@/lib/utils';
import MilestoneTracker from './MilestoneTracker';
import type { TrackerStage } from './MilestoneTracker';

interface Props {
  title: string;
  categoryName: string | null;
  customerName: string;
  areaName: string | null;
  /** What the pro should do next, e.g. "Send 50% update" */
  badge: { label: string; tone: BadgeTone };
  stages: TrackerStage[];
  /** ₹ approved so far, of the hired quote */
  earned: number;
  amount: number;
  unreadMessages: number;
  onOpen: () => void;
}

/** A job the provider was hired for: next step, the four stages and money approved so far. */
const HiredJobCard = (p: Props) => (
  <button
    type="button"
    onClick={p.onOpen}
    className="flex w-full flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm active:scale-[.98]"
  >
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge label={p.badge.label} tone={p.badge.tone} />
          {p.categoryName && <span className="text-[11px] font-medium text-slate-500">{p.categoryName}</span>}
        </div>
        <div className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900">{p.title}</div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-[10px] text-slate-500">Approved</div>
        <div className="text-sm font-bold text-slate-900">{formatINR(p.earned)}</div>
        <div className="text-[10px] text-slate-500">of {formatINR(p.amount)}</div>
      </div>
    </div>
    <MilestoneTracker stages={p.stages} />
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 pt-2 text-xs text-slate-500">
      <span className="flex items-center gap-1">
        <UserRound size={12} />
        {p.customerName}
      </span>
      {p.areaName && (
        <span className="flex items-center gap-1">
          <MapPin size={12} />
          {p.areaName}
        </span>
      )}
      {p.unreadMessages > 0 && (
        <span className="ml-auto flex items-center gap-1 font-semibold text-indigo-600">
          <MessageCircle size={12} />
          {p.unreadMessages} new
        </span>
      )}
    </div>
  </button>
);

export default HiredJobCard;
