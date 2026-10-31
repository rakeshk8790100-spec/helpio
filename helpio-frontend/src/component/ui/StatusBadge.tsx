export type BadgeTone = 'success' | 'warning' | 'error' | 'neutral' | 'brand';

const TONES: Record<BadgeTone, string> = {
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  error: 'bg-red-50 text-red-600',
  neutral: 'bg-slate-100 text-slate-500',
  brand: 'bg-indigo-50 text-indigo-700',
};

interface Props {
  label: string;
  tone?: BadgeTone;
}

/** Small rounded status label. Always carries text, never colour alone. */
const StatusBadge = ({ label, tone = 'neutral' }: Props) => (
  <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ${TONES[tone]}`}>
    {label}
  </span>
);

export default StatusBadge;
