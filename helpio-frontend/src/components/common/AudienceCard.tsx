import { ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const TONES = {
  brand: {
    card: 'bg-linear-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/25',
    icon: 'bg-white/20',
    cta: 'bg-white text-indigo-700',
  },
  dark: {
    card: 'bg-slate-900',
    icon: 'bg-white/10 text-amber-300',
    cta: 'bg-amber-400 text-slate-900',
  },
};

interface Props {
  Icon: LucideIcon;
  eyebrow: string;
  title: string;
  /** Short value line, e.g. "Quotes in minutes" or "Earn up to ₹45k/mo" */
  highlight: string;
  ctaLabel: string;
  onClick: () => void;
  tone?: keyof typeof TONES;
}

/** Entry card for one audience on a shared page (e.g. "I need help" / "I want to earn"). */
const AudienceCard = ({ Icon, eyebrow, title, highlight, ctaLabel, onClick, tone = 'brand' }: Props) => {
  const t = TONES[tone];
  return (
    <div className={`flex flex-col rounded-2xl p-4 text-white ${t.card}`}>
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${t.icon}`}>
        <Icon size={18} />
      </span>
      <div className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-white/70">{eyebrow}</div>
      <div className="mt-0.5 text-base font-bold leading-tight">{title}</div>
      <div className="mt-1 text-xs text-white/80">{highlight}</div>
      <button
        type="button"
        onClick={onClick}
        className={`mt-4 flex items-center justify-center gap-1 rounded-xl py-2 text-xs font-semibold active:scale-[.98] ${t.cta}`}
      >
        {ctaLabel}
        <ArrowRight size={14} />
      </button>
    </div>
  );
};

export default AudienceCard;
