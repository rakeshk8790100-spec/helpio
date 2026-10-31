import { Circle, CircleCheck, Clock, Lock } from 'lucide-react';
import type { ChecklistItem } from '../../common/CommonDto';
import { ChecklistState } from '../../common/CommonEnum';

const ICONS = {
  [ChecklistState.DONE]: <CircleCheck size={18} className="text-emerald-400" />,
  [ChecklistState.PENDING]: <Circle size={18} className="text-amber-300" />,
  [ChecklistState.UNAVAILABLE]: <Clock size={18} className="text-white/40" />,
};

interface Props {
  title: string;
  items: ChecklistItem[];
  /** Why something is locked, e.g. quoting before sign-up is finished */
  lockedNote?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Dark provider checklist (sign-up and verification steps) with progress and one next action. */
const ChecklistCard = ({ title, items, lockedNote, actionLabel, onAction }: Props) => {
  const done = items.filter((item) => item.state === ChecklistState.DONE).length;
  return (
    <section className="rounded-2xl bg-slate-900 p-4 text-white">
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold">{title}</span>
        <span className="text-xs text-amber-300">
          {done}/{items.length} done
        </span>
      </div>
      <ul className="mt-3 flex flex-col gap-2.5">
        {items.map((item) => (
          <li key={item.key} className="flex items-center gap-2.5 text-sm">
            {ICONS[item.state]}
            <span className={item.state === ChecklistState.DONE ? 'text-white/60' : 'text-white'}>{item.label}</span>
            {item.state === ChecklistState.UNAVAILABLE && (
              <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/70">Coming soon</span>
            )}
          </li>
        ))}
      </ul>
      {lockedNote && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-white/10 p-2.5 text-xs text-white/80">
          <Lock size={14} className="mt-0.5 shrink-0 text-amber-300" />
          {lockedNote}
        </div>
      )}
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 h-10 w-full rounded-xl bg-amber-400 text-sm font-semibold text-slate-900 active:scale-[.98]"
        >
          {actionLabel}
        </button>
      )}
    </section>
  );
};

export default ChecklistCard;
