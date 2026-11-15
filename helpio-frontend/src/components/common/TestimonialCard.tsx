import { Star } from 'lucide-react';
import type { Testimonial } from '../../common/CommonDto';
import { UserRole } from '../../common/CommonEnum';
import Avatar from '../ui/Avatar';
import StatusBadge from '../ui/StatusBadge';

/** Quote from a customer or provider, with a role badge. Sized for HScroll. */
const TestimonialCard = ({ testimonial: t }: { testimonial: Testimonial }) => (
  <figure className="flex w-64 shrink-0 snap-start flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
    <div className="flex items-center gap-0.5" aria-label={`${t.rating} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={12}
          className={i < Math.round(t.rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}
        />
      ))}
    </div>
    <blockquote className="mt-2 flex-1 text-sm leading-snug text-slate-700">"{t.text}"</blockquote>
    <figcaption className="mt-3 flex items-center gap-2">
      <Avatar name={t.name} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-slate-900">{t.name}</span>
        <span className="block truncate text-[11px] text-slate-500">{t.meta}</span>
      </span>
      <StatusBadge
        label={t.role === UserRole.PROVIDER ? 'Provider' : 'Customer'}
        tone={t.role === UserRole.PROVIDER ? 'success' : 'brand'}
      />
    </figcaption>
  </figure>
);

export default TestimonialCard;
