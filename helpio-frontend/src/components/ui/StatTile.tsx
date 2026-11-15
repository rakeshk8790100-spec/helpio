import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: ReactNode;
  /** `glass` sits on gradient cards, `plain` on white surfaces */
  variant?: 'glass' | 'plain';
}

/** Small labelled metric tile. */
const StatTile = ({ label, value, variant = 'plain' }: Props) => (
  <div className={`rounded-xl py-2 text-center ${variant === 'glass' ? 'bg-white/15' : 'bg-slate-50'}`}>
    <div className={`text-sm font-semibold ${variant === 'glass' ? 'text-white' : 'text-slate-900'}`}>{value}</div>
    <div className={`text-[10px] ${variant === 'glass' ? 'text-white/70' : 'text-slate-500'}`}>{label}</div>
  </div>
);

export default StatTile;
