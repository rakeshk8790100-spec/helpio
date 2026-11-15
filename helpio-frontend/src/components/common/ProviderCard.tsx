import { BadgeCheck, CalendarDays, MapPin } from 'lucide-react';
import type { ProviderCard as ProviderCardData } from '@/common/CommonDto';
import Avatar from '@/components/ui/Avatar';
import RatingStars from '@/components/ui/RatingStars';
import { formatDays } from '@/lib/utils';
import { PROFICIENCY_LABEL } from './proficiency';

interface Props {
  provider: ProviderCardData;
  onOpen: () => void;
  /** Narrow carousel version without bio and days */
  compact?: boolean;
}

/** A pro in search results: photo, name, area and rough distance, their skills and level, working days. */
const ProviderCard = ({ provider: p, onOpen, compact = false }: Props) => {
  const place = [p.areaName, p.approxDistanceKm !== null && `~${p.approxDistanceKm} km`].filter(Boolean).join(' · ');
  const level = [PROFICIENCY_LABEL[p.topProficiency], p.maxYearsExperience && `${p.maxYearsExperience} yrs`]
    .filter(Boolean)
    .join(' · ');
  const more = p.skillCount - p.skills.length;
  const rating = p.rating.count > 0 && p.rating.average !== null
    ? <RatingStars variant="compact" value={p.rating.average} count={p.rating.count} />
    : null;

  if (compact) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="flex w-40 shrink-0 snap-start flex-col items-center rounded-2xl border border-slate-100 bg-white p-3 text-center shadow-sm active:scale-[.98]"
      >
        <Avatar name={p.displayName} src={p.avatarUrl} size="lg" />
        <span className="mt-2 flex items-center gap-1 text-sm font-semibold text-slate-900">
          {p.displayName}
          <BadgeCheck size={13} className="text-indigo-500" aria-label="Helpio pro" />
        </span>
        <span className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">{p.skills[0]?.name ?? 'Helpio pro'}</span>
        {rating && <span className="mt-1">{rating}</span>}
        {place && <span className="mt-0.5 line-clamp-1 text-[11px] text-slate-400">{place}</span>}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm active:scale-[.98]"
    >
      <div className="flex items-start gap-3">
        <Avatar name={p.displayName} src={p.avatarUrl} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="truncate text-base font-semibold text-slate-900">{p.displayName}</span>
            <BadgeCheck size={15} className="shrink-0 text-indigo-500" aria-label="Helpio pro" />
            {rating && <span className="ml-auto pl-2">{rating}</span>}
          </div>
          {level && <div className="text-xs font-medium text-indigo-700">{level}</div>}
          {place && (
            <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
              <MapPin size={12} />
              {place}
            </div>
          )}
        </div>
      </div>
      {p.bioSnippet && <div className="line-clamp-2 text-sm text-slate-600">{p.bioSnippet}</div>}
      <div className="flex flex-wrap gap-1.5">
        {p.skills.map((s) => (
          <span key={s.skillId} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
            {s.name}
          </span>
        ))}
        {more > 0 && <span className="rounded-full px-1 py-1 text-xs text-slate-500">+{more} more</span>}
      </div>
      {p.workDays.length > 0 && (
        <div className="flex items-center gap-1 border-t border-slate-100 pt-2 text-xs text-slate-500">
          <CalendarDays size={12} />
          Works {formatDays(p.workDays)}
        </div>
      )}
    </button>
  );
};

export default ProviderCard;
