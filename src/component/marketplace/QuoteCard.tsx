import { Button, Popconfirm } from 'antd';
import { BadgeCheck, MapPin } from 'lucide-react';
import type { CustomerQuote } from '../../common/CommonDto';
import { QuoteStatus } from '../../common/CommonEnum';
import { formatINR } from '../../lib/utils';
import Avatar from '../ui/Avatar';
import StatusBadge from '../ui/StatusBadge';
import { PROFICIENCY_LABEL } from './proficiency';

interface Props {
  quote: CustomerQuote;
  /** Lowest pending quote on the job */
  cheapest?: boolean;
  /** Pending quotes on an open job: hire this pro, or turn the quote down (each asks first) */
  onAccept?: () => void;
  onReject?: () => void;
  /** Which action is in progress */
  acting?: 'accept' | 'reject' | null;
  /** Another quote is being answered; wait */
  disabled?: boolean;
}

/** One provider's quote, as the customer sees it before hire: "Ravi S.", experience, ~distance, price and note. */
const QuoteCard = ({ quote, cheapest = false, onAccept, onReject, acting = null, disabled = false }: Props) => {
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
      {quote.status === QuoteStatus.PENDING && onAccept && onReject && (
        <div className="mt-3 grid grid-cols-[1fr_2fr] gap-2">
          <Popconfirm title="Decline this quote?" okText="Decline" okButtonProps={{ danger: true }} onConfirm={onReject} disabled={disabled}>
            <Button size="large" loading={acting === 'reject'} disabled={disabled && acting !== 'reject'}>
              Decline
            </Button>
          </Popconfirm>
          <Popconfirm
            title={`Hire ${quote.providerLabel} for ${formatINR(quote.amount)}?`}
            description="Other quotes on this job will be declined."
            okText="Hire"
            onConfirm={onAccept}
            disabled={disabled}
          >
            <Button type="primary" size="large" loading={acting === 'accept'} disabled={disabled && acting !== 'accept'}>
              Accept quote
            </Button>
          </Popconfirm>
        </div>
      )}
    </div>
  );
};

export default QuoteCard;
