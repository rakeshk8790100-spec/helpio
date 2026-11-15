import { Clock, Star } from 'lucide-react';
import type { Service } from '@/common/CommonDto';
import { formatDuration, formatINR } from '@/lib/utils';

interface Props {
  service: Service;
  onBook: () => void;
}

/** Bookable service tile. Sized for HScroll. */
const ServiceCard = ({ service, onBook }: Props) => (
  <div className="flex w-44 shrink-0 snap-start flex-col rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
    <div className="h-20 rounded-xl bg-linear-to-br from-indigo-100 to-violet-100" />
    <div className="mt-2 line-clamp-2 text-sm font-semibold leading-tight text-slate-900">{service.name}</div>
    <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
      <span className="flex items-center gap-0.5">
        <Star size={11} className="fill-amber-400 text-amber-400" />
        {service.rating} ({service.reviews})
      </span>
      <span className="flex items-center gap-0.5">
        <Clock size={11} />
        {formatDuration(service.durationMins)}
      </span>
    </div>
    <div className="mt-auto flex items-center justify-between pt-2">
      <span className="text-xs text-slate-500">
        from <b className="text-sm text-slate-900">{formatINR(service.fromPrice)}</b>
      </span>
      <button
        type="button"
        onClick={onBook}
        className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 active:scale-95"
      >
        Book
      </button>
    </div>
  </div>
);

export default ServiceCard;
