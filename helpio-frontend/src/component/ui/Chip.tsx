import type { ReactNode } from 'react';

const TONES = {
  light: {
    active: 'border-indigo-600 bg-indigo-600 text-white',
    idle: 'border-slate-200 bg-white text-slate-700',
  },
  dark: {
    active: 'border-white bg-white text-slate-900',
    idle: 'border-white/20 bg-transparent text-white/80',
  },
};

interface Props {
  active?: boolean;
  onClick?: () => void;
  icon?: ReactNode;
  /** `dark` for use on slate-900 / gradient surfaces */
  tone?: keyof typeof TONES;
  /** Shown but not changeable, e.g. a choice already saved */
  disabled?: boolean;
  children: ReactNode;
}

/** Pill used for filters (toggle with `active`) and for compact action shortcuts. */
const Chip = ({ active = false, onClick, icon, tone = 'light', disabled = false, children }: Props) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-pressed={onClick ? active : undefined}
    className={`flex shrink-0 snap-start items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition active:scale-95 disabled:opacity-60 disabled:active:scale-100 ${
      active ? TONES[tone].active : TONES[tone].idle
    }`}
  >
    {icon}
    {children}
  </button>
);

export default Chip;
