import { Star } from 'lucide-react';

interface Props {
  /** 1 to 5; an average may have decimals */
  value: number;
  /** How many ratings, shown as "(12)" */
  count?: number;
  /** `compact`: one star and the number, for cards and rows */
  variant?: 'stars' | 'compact';
  size?: number;
}

/** Read-only star rating: five stars, or "★ 4.6 (12)" in compact form. */
const RatingStars = ({ value, count, variant = 'stars', size = 14 }: Props) => {
  const label = `${value} out of 5 stars${count !== undefined ? `, ${count} review${count === 1 ? '' : 's'}` : ''}`;

  if (variant === 'compact') {
    return (
      <span role="img" aria-label={label} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-slate-700">
        <Star size={size} className="fill-amber-400 text-amber-400" />
        {value.toFixed(1)}
        {count !== undefined && <span className="font-normal text-slate-500">({count})</span>}
      </span>
    );
  }

  return (
    <span role="img" aria-label={label} className="inline-flex shrink-0 items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} className={n <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />
      ))}
      {count !== undefined && <span className="ml-1 text-xs text-slate-500">({count})</span>}
    </span>
  );
};

export default RatingStars;
