import { CircleCheck } from 'lucide-react';
import type { EarningRate } from '@/common/CommonDto';
import Chip from '@/components/ui/Chip';
import { formatINR } from '@/lib/utils';

interface Props {
  rates: EarningRate[];
  skillId: string;
  onSkillChange: (skillId: string) => void;
  hours: number;
  onHoursChange: (hours: number) => void;
  /** Computed by the page from the selected rate and hours */
  monthlyEstimate: number;
  benefits: string[];
  minHours?: number;
  maxHours?: number;
}

/** Interactive provider earnings estimate. Designed for a dark (slate-900) section. */
const EarningsCalculator = ({
  rates,
  skillId,
  onSkillChange,
  hours,
  onHoursChange,
  monthlyEstimate,
  benefits,
  minHours = 5,
  maxHours = 50,
}: Props) => (
  <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
    <div className="text-xs font-medium text-white/60">Your skill</div>
    <div className="scrollbar-none -mx-4 mt-2 flex gap-2 overflow-x-auto px-4">
      {rates.map((r) => (
        <Chip key={r.skillId} tone="dark" active={r.skillId === skillId} onClick={() => onSkillChange(r.skillId)}>
          {r.skillName}
        </Chip>
      ))}
    </div>

    <label className="mt-4 block">
      <span className="flex items-center justify-between text-xs font-medium text-white/60">
        Hours per week
        <span className="text-sm font-semibold text-white">{hours}h</span>
      </span>
      <input
        type="range"
        min={minHours}
        max={maxHours}
        value={hours}
        onChange={(e) => onHoursChange(Number(e.target.value))}
        className="mt-2 w-full accent-indigo-400"
      />
    </label>

    <div className="mt-4 rounded-xl bg-linear-to-br from-indigo-500 to-violet-500 p-3 text-center">
      <div className="text-[11px] text-white/80">Estimated monthly earnings</div>
      <div aria-live="polite" className="text-3xl font-bold text-white">
        ≈ {formatINR(monthlyEstimate)}
      </div>
    </div>

    <ul className="mt-4 grid grid-cols-2 gap-2">
      {benefits.map((b) => (
        <li key={b} className="flex items-start gap-1.5 text-xs text-white/80">
          <CircleCheck size={14} className="mt-px shrink-0 text-emerald-400" />
          {b}
        </li>
      ))}
    </ul>
  </div>
);

export default EarningsCalculator;
