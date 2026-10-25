import { BadgeCheck, Lock, MapPin } from 'lucide-react';
import type { CustomerQuote } from '../../common/CommonDto';
import { Proficiency, QuoteStatus } from '../../common/CommonEnum';
import { formatINR } from '../../lib/utils';
import Avatar from '../ui/Avatar';
import StatusBadge from '../ui/StatusBadge';

const PROFICIENCY_LABEL = {
  [Proficiency.BEGINNER]: 'Beginner',
  [Proficiency.INTERMEDIATE]: 'Skilled',
  [Proficiency.EXPERT]: 'Expert',
};

interface Props {
  quote: CustomerQuote;
  /** Lowest pending quote on the job */
  cheapest?: boolean;
  /** Why Accept/Reject can't be used yet; omit once they work */
  lockedNote?: string;
  onAccept?: () => void;
  onReject?: () => void;
}

/** One provider's quote, as the customer sees it before hire: "Ravi S.", experience, ~distance, price and note. */
const QuoteCard = ({ quote, cheapest = false, lockedNote, onAccept, onReject }: Props) => {
  const locked = Boolean(lockedNote);
  const experience = [
    quote.proficiency && PROFICIENCY_LABEL[quote.proficiency],
    quote.yearsExperience !== null && `${quote.yearsExperience} yrs`,
  ].filter(Boolean).join(' · ');

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Avatar name={quote.providerLabel} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-slate-900">{quote.providerLabel}</span>
            <BadgeCheck size={14} className="shrink-0 text-indigo-500" aria-label="Helpio pro" />
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
            {experience && <span>{experience}</span>}
            {quote.approxDistanceKm !== null && (
              <span className="flex items-center gap-0.5">
                <MapPin size={11} />~{quote.approxDistanceKm} km away
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-base font-bold text-slate-900">{formatINR(quote.amount)}</div>
          {cheapest && <StatusBadge label="Lowest" tone="success" />}
          {quote.status !== QuoteStatus.PENDING && <StatusBadge label={quote.status === QuoteStatus.ACCEPTED ? 'Accepted' : 'Declined'} tone={quote.status === QuoteStatus.ACCEPTED ? 'success' : 'neutral'} />}
        </div>
      </div>
      {quote.message && <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">{quote.message}</div>}
      {quote.status === QuoteStatus.PENDING && (
        <>
          <div className="mt-3 grid grid-cols-[1fr_2fr] gap-2">
            <button
              type="button"
              disabled={locked}
              onClick={onReject}
              className="h-10 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 active:scale-[.98] disabled:bg-slate-200 disabled:text-slate-500"
            >
              Decline
            </button>
            <button
              type="button"
              disabled={locked}
              onClick={onAccept}
              className="flex h-10 items-center justify-center gap-1 rounded-xl bg-indigo-600 text-sm font-semibold text-white active:scale-[.98] disabled:bg-slate-200 disabled:text-slate-500"
            >
              {locked && <Lock size={14} />}
              Accept quote
            </button>
          </div>
          {lockedNote && <div className="mt-2 text-[11px] text-slate-500">{lockedNote}</div>}
        </>
      )}
    </div>
  );
};

export default QuoteCard;
