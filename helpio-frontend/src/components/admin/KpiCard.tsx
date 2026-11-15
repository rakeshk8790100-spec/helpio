
interface Props {
  label: string;
  value: string;
  /** One line under the value, e.g. "3 waiting for approval" */
  hint?: string;
  /** Amber: something is waiting for an admin */
  attention?: boolean;
  /** Opens the page behind the number */
  onClick?: () => void;
}

/** A labelled number on the admin dashboard; tappable when there's a page behind it. */
const KpiCard = ({ label, value, hint, attention = false, onClick }: Props) => {
  const body = (
    <>
      <span className="block text-xs font-medium text-slate-500">{label}</span>
      <span className="mt-1 block text-2xl font-bold text-slate-900">{value}</span>
      {hint && <span className={`mt-1 block text-xs ${attention ? 'font-medium text-amber-700' : 'text-slate-500'}`}>{hint}</span>}
    </>
  );
  const box = `rounded-2xl border bg-white p-4 text-left shadow-sm ${attention ? 'border-amber-200' : 'border-slate-100'}`;
  return onClick ? (
    <button type="button" onClick={onClick} className={`${box} transition hover:border-indigo-200 active:scale-[.98]`}>
      {body}
    </button>
  ) : (
    <div className={box}>{body}</div>
  );
};

export default KpiCard;
