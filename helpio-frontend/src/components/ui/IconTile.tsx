import type { LucideIcon } from 'lucide-react';

interface Props {
  Icon: LucideIcon;
  label: string;
  onClick?: () => void;
}

/** Square icon + caption, used in grids (categories, shortcuts). */
const IconTile = ({ Icon, label, onClick }: Props) => (
  <button type="button" onClick={onClick} className="flex flex-col items-center gap-1.5 active:scale-95">
    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-indigo-600">
      <Icon size={22} />
    </span>
    <span className="text-[11px] font-medium text-slate-700">{label}</span>
  </button>
);

export default IconTile;
