import { Link, useLocation } from "react-router-dom";
import { Construction } from "lucide-react";

/** Placeholder for routes linked from Home that aren't built yet. */
const ComingSoon = () => {
  const { pathname } = useLocation();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <Construction size={36} className="text-indigo-400" />
      <span className="text-base font-semibold text-slate-900">Coming soon</span>
      <span className="font-mono text-xs text-slate-400">{pathname}</span>
      <Link to="/" className="text-sm font-medium">
        Back to home
      </Link>
    </div>
  );
};

export default ComingSoon;
