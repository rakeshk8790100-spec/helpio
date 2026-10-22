import { Plus, Search, Star } from 'lucide-react';
import type { Service } from '../../common/CommonDto';
import { formatINR } from '../../lib/utils';

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** The term results belong to; dropdown shows when it is set */
  term: string;
  results: Service[];
  loading: boolean;
  onSelect: (service: Service) => void;
  onPostCustom: (term: string) => void;
  placeholder?: string;
}

/** Sticky service search with suggestions and a "post a custom job" fallback. */
const SearchBox = ({
  value,
  onChange,
  term,
  results,
  loading,
  onSelect,
  onPostCustom,
  placeholder = 'What do you need help with?',
}: Props) => (
  <div className="sticky -top-5 z-20 -mx-5 -mt-4 bg-white px-5 py-2">
    <label className="flex h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 focus-within:border-indigo-400 focus-within:bg-white">
      <Search size={18} className="text-slate-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-full flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
      />
    </label>

    {term && (
      <div className="absolute inset-x-5 top-full mt-1 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-lg">
        {loading ? (
          <div className="px-4 py-3 text-xs text-slate-400">Searching…</div>
        ) : (
          <>
            {results.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelect(s)}
                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
              >
                <span className="text-sm text-slate-800">{s.name}</span>
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <Star size={12} className="fill-amber-400 text-amber-400" />
                  {s.rating} · from {formatINR(s.fromPrice)}
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => onPostCustom(term)}
              className="flex w-full items-center gap-2 border-t border-slate-100 bg-indigo-50/60 px-4 py-3 text-left text-sm font-medium text-indigo-700"
            >
              <Plus size={16} />
              {results.length === 0 ? `Can't find "${term}"? Post a custom job` : `Post a custom job for "${term}"`}
            </button>
          </>
        )}
      </div>
    )}
  </div>
);

export default SearchBox;
