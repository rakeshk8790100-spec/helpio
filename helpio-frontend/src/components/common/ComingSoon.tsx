import { Construction, SearchX } from 'lucide-react';

interface Props {
  /** "soon": planned but not built yet; "missing": no such page */
  kind: 'soon' | 'missing';
  path: string;
  onHome: () => void;
}

/** Full-page note for a route that isn't built yet, or doesn't exist, with a way back home. */
const ComingSoon = ({ kind, path, onHome }: Props) => {
  const Icon = kind === 'soon' ? Construction : SearchX;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <Icon size={36} className="text-indigo-400" />
      <span className="text-base font-semibold text-slate-900">{kind === 'soon' ? 'Coming soon' : "This page doesn't exist"}</span>
      <span className="font-mono text-xs text-slate-400">{path}</span>
      <button type="button" onClick={onHome} className="text-sm font-medium text-indigo-600 active:scale-95">
        Back to home
      </button>
    </div>
  );
};

export default ComingSoon;
