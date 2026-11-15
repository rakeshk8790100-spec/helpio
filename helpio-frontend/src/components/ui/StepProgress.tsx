interface Props {
  /** Short label per step, in order */
  steps: string[];
  /** 1-based index of the current step */
  current: number;
}

/** Segmented "Step 2 of 3" progress for multi-screen flows. */
const StepProgress = ({ steps, current }: Props) => (
  <div
    role="progressbar"
    aria-valuemin={1}
    aria-valuemax={steps.length}
    aria-valuenow={current}
    aria-valuetext={`Step ${current} of ${steps.length}: ${steps[current - 1]}`}
  >
    <div className="flex gap-1.5">
      {steps.map((label, index) => (
        <div key={label} className="flex flex-1 flex-col gap-1.5">
          <span className={`h-1.5 rounded-full transition ${index < current ? 'bg-indigo-500' : 'bg-slate-200'}`} />
          <span className={`text-[11px] ${index + 1 === current ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>
            {label}
          </span>
        </div>
      ))}
    </div>
  </div>
);

export default StepProgress;
