import { MapPin, UserRound } from 'lucide-react';
import type { NearbyJob } from '../../common/CommonDto';
import { QuoteStatus } from '../../common/CommonEnum';
import { formatINR } from '../../lib/utils';
import StatusBadge from '../ui/StatusBadge';
import type { BadgeTone } from '../ui/StatusBadge';

const QUOTE_BADGE: Record<QuoteStatus, { label: string; tone: BadgeTone }> = {
  [QuoteStatus.PENDING]: { label: 'Quoted', tone: 'brand' },
  [QuoteStatus.ACCEPTED]: { label: 'Hired', tone: 'success' },
  [QuoteStatus.REJECTED]: { label: 'Not chosen', tone: 'neutral' },
  [QuoteStatus.WITHDRAWN]: { label: 'Withdrawn', tone: 'neutral' },
};

interface Props {
  job: NearbyJob;
  onOpen: () => void;
}

/** A job near a provider, before hire: approximate distance, area only, customer as "Asha K.". */
const NearbyJobCard = ({ job, onOpen }: Props) => {
  const distance = job.approxDistanceKm === null ? 'Your pincode' : `~${job.approxDistanceKm} km`;
  const quote = job.myQuote && { ...QUOTE_BADGE[job.myQuote.status], amount: job.myQuote.amount };
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm active:scale-[.98]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {job.inviteStatus !== null && <StatusBadge label="Requested you" tone="brand" />}
            {job.isEmergency && <StatusBadge label="Urgent" tone="error" />}
            {job.categoryName && <span className="text-[11px] font-medium text-slate-500">{job.categoryName}</span>}
          </div>
          <div className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900">{job.title}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[10px] text-slate-500">Budget</div>
          <div className="text-sm font-bold text-slate-900">{job.budget === null ? 'Open' : formatINR(job.budget)}</div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <MapPin size={12} />
          {job.areaName ? `${distance} · ${job.areaName}` : distance}
        </span>
        <span className="flex items-center gap-1">
          <UserRound size={12} />
          {job.customerLabel}
        </span>
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
        <span className="text-slate-500">
          {job.quoteCount === 0 ? 'No quotes yet' : `${job.quoteCount} quote${job.quoteCount === 1 ? '' : 's'}`}
        </span>
        {quote ? (
          <StatusBadge label={`${quote.label} · ${formatINR(quote.amount)}`} tone={quote.tone} />
        ) : (
          <span className="font-semibold text-indigo-600">View and quote</span>
        )}
      </div>
    </button>
  );
};

export default NearbyJobCard;
