import type { LucideIcon } from 'lucide-react';

export interface StepListItem {
  title: string;
  text: string;
  Icon: LucideIcon;
}

interface Props {
  steps: StepListItem[];
  /** `dark` for use on slate-900 / gradient surfaces */
  tone?: 'light' | 'dark';
}

/** Numbered vertical steps joined by a connector line ("how it works", onboarding). */
const StepList = ({ steps, tone = 'light' }: Props) => {
  const dark = tone === 'dark';

  return (
    <ol className="flex flex-col">
      {steps.map(({ title, text, Icon }, i) => (
        <li key={title} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                dark ? 'bg-white/10 text-indigo-300' : 'bg-indigo-50 text-indigo-600'
              }`}
            >
              <Icon size={16} />
            </span>
            {i < steps.length - 1 && <span className={`w-px flex-1 ${dark ? 'bg-white/15' : 'bg-indigo-100'}`} />}
          </div>
          <div className={i < steps.length - 1 ? 'pb-4' : ''}>
            <div className={`text-sm font-semibold ${dark ? 'text-white' : 'text-slate-900'}`}>
              <span className={dark ? 'text-indigo-300' : 'text-indigo-500'}>{i + 1}. </span>
              {title}
            </div>
            <div className={`mt-0.5 text-xs leading-snug ${dark ? 'text-white/60' : 'text-slate-500'}`}>{text}</div>
          </div>
        </li>
      ))}
    </ol>
  );
};

export default StepList;
