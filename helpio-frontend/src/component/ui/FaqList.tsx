import { ChevronDown } from 'lucide-react';

export interface FaqListItem {
  q: string;
  a: string;
}

/** Accordion of questions built on native <details>, so it is keyboard and screen-reader friendly. */
const FaqList = ({ items }: { items: FaqListItem[] }) => (
  <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white">
    {items.map(({ q, a }) => (
      <details key={q} className="group px-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3 text-sm font-medium text-slate-900 [&::-webkit-details-marker]:hidden">
          {q}
          <ChevronDown size={16} className="shrink-0 text-slate-400 transition group-open:rotate-180" />
        </summary>
        <div className="pb-3 text-xs leading-relaxed text-slate-600">{a}</div>
      </details>
    ))}
  </div>
);

export default FaqList;
