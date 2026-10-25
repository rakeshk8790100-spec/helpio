import { ArrowRight, ShieldAlert } from 'lucide-react';
import ProgressBar from '../ui/ProgressBar';

interface Props {
  /** e.g. "Active job" */
  eyebrow: string;
  title: string;
  statusLabel: string;
  /** Approved work, 0–100 */
  progressPct: number;
  /** What happens next, in plain words */
  nextStep: string;
  actionLabel: string;
  onAction: () => void;
  onSafety: () => void;
}

/** Gradient hero card for the job in progress. Always offers Safety. */
const ActiveJobCard = ({ eyebrow, title, statusLabel, progressPct, nextStep, actionLabel, onAction, onSafety }: Props) => (
  <section className="rounded-2xl bg-linear-to-br from-indigo-500 to-violet-500 p-4 text-white shadow-lg shadow-indigo-500/25">
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-white/70">{eyebrow}</span>
      <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold">{statusLabel}</span>
    </div>
    <div className="mt-1 text-lg font-semibold leading-tight">{title}</div>
    <div className="mt-3 flex items-center gap-2">
      <ProgressBar value={progressPct} label="Approved work" variant="glass" />
      <span className="text-xs font-semibold">{progressPct}%</span>
    </div>
    <div className="mt-2 text-xs text-white/80">{nextStep}</div>
    <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
      <button
        type="button"
        onClick={onAction}
        className="flex h-10 items-center justify-center gap-1 rounded-xl bg-white text-sm font-semibold text-indigo-700 active:scale-[.98]"
      >
        {actionLabel}
        <ArrowRight size={14} />
      </button>
      <button
        type="button"
        onClick={onSafety}
        aria-label="Safety: call emergency services"
        className="flex h-10 items-center gap-1 rounded-xl bg-red-500 px-3 text-sm font-semibold text-white active:scale-95"
      >
        <ShieldAlert size={16} />
        Safety
      </button>
    </div>
  </section>
);

export default ActiveJobCard;
