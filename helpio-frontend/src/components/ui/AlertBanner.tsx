import { CircleAlert } from 'lucide-react';

interface Props {
  message: string;
  onRetry?: () => void;
}

/** Inline error notice with an optional retry. */
const AlertBanner = ({ message, onRetry }: Props) => (
  <div role="alert" className="flex items-center gap-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
    <CircleAlert size={18} className="shrink-0" />
    <span className="flex-1">{message}</span>
    {onRetry && (
      <button type="button" onClick={onRetry} className="shrink-0 font-semibold text-red-700 underline active:scale-95">
        Retry
      </button>
    )}
  </div>
);

export default AlertBanner;
