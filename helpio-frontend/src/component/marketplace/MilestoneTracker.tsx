import { Check, Clock3, RotateCcw } from 'lucide-react';
import { MilestoneStatus } from '../../common/CommonEnum';

export interface TrackerStage {
  stage: number;
  /** 25, 50, 75 or 100 */
  percent: number;
  status: MilestoneStatus;
  /** Target time, e.g. "4:45 PM"; shown under the percent */
  timeLabel?: string | null;
  /** Past its target without an update */
  overdue?: boolean;
}

interface Props {
  stages: TrackerStage[];
  /** `glass` sits on gradient cards, `plain` on white surfaces */
  variant?: 'glass' | 'plain';
}

const STATE_TEXT: Record<MilestoneStatus, string> = {
  [MilestoneStatus.PENDING]: 'not started',
  [MilestoneStatus.SUBMITTED]: 'waiting for approval',
  [MilestoneStatus.APPROVED]: 'approved',
  [MilestoneStatus.CHANGES_REQUESTED]: 'changes requested',
};

const segmentClass = (status: MilestoneStatus, glass: boolean, overdue: boolean) => {
  if (overdue) return glass ? 'bg-red-300' : 'bg-red-500';
  if (status === MilestoneStatus.APPROVED) return glass ? 'bg-white' : 'bg-emerald-500';
  if (status === MilestoneStatus.SUBMITTED) return glass ? 'bg-amber-300' : 'bg-amber-400';
  if (status === MilestoneStatus.CHANGES_REQUESTED) return glass ? 'bg-red-300' : 'bg-red-400';
  return glass ? 'bg-white/25' : 'bg-slate-200';
};

/** Four 25% segments: approved, waiting for the customer, sent back, or not started. Each carries a text label too. */
const MilestoneTracker = ({ stages, variant = 'plain' }: Props) => {
  const glass = variant === 'glass';
  return (
    <ol className="grid grid-cols-4 gap-1.5" aria-label="Job progress">
      {stages.map((s) => (
        <li
          key={s.stage}
          className="flex flex-col gap-1"
          aria-label={`${s.percent}%: ${s.overdue ? 'overdue' : STATE_TEXT[s.status]}${s.timeLabel ? `, target ${s.timeLabel}` : ''}`}
        >
          <span className={`h-1.5 rounded-full transition ${segmentClass(s.status, glass, Boolean(s.overdue))}`} />
          <span
            className={`flex items-center gap-0.5 text-[10px] font-medium ${
              glass ? 'text-white/80' : s.status === MilestoneStatus.PENDING ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            {s.status === MilestoneStatus.APPROVED && <Check size={10} />}
            {s.status === MilestoneStatus.SUBMITTED && <Clock3 size={10} />}
            {s.status === MilestoneStatus.CHANGES_REQUESTED && <RotateCcw size={10} />}
            {s.percent}%
          </span>
          {s.timeLabel && (
            <span className={`-mt-0.5 text-[10px] ${s.overdue ? 'font-semibold text-red-600' : glass ? 'text-white/70' : 'text-slate-400'}`}>
              {s.timeLabel}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
};

export default MilestoneTracker;
