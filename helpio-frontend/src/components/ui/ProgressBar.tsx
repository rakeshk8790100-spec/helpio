
interface Props {
  /** 0–100 */
  value: number;
  label: string;
  /** `glass` sits on gradient cards, `plain` on white surfaces */
  variant?: 'glass' | 'plain';
}

/** Thin horizontal progress bar (e.g. approved work 0/25/50/75/100%). */
const ProgressBar = ({ value, label, variant = 'plain' }: Props) => (
  <div
    role="progressbar"
    aria-label={label}
    aria-valuenow={value}
    aria-valuemin={0}
    aria-valuemax={100}
    className={`h-1.5 w-full overflow-hidden rounded-full ${variant === 'glass' ? 'bg-white/25' : 'bg-slate-100'}`}
  >
    <div
      className={`h-full rounded-full transition-all ${variant === 'glass' ? 'bg-white' : 'bg-indigo-500'}`}
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
);

export default ProgressBar;
