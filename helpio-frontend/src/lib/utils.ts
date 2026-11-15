import type { WithStatus } from '@/common/CommonDto';
import { apiErrorMessage } from './apiError';

export const formatINR = (amount: number) =>
  `₹${amount.toLocaleString('en-IN')}`;

export const formatDuration = (mins: number) =>
  mins < 60 ? `${mins} min` : `${+(mins / 60).toFixed(1)} hr`;

/** Time estimates a pro can pick when starting a job, in minutes */
export const ESTIMATE_MINUTES = [30, 60, 90, 120, 180, 240, 360, 480];

/** Estimate chips; the job's own duration is added when it isn't one of the steps */
export const estimateOptions = (jobMins: number | null) =>
  [...new Set([...ESTIMATE_MINUTES, ...(jobMins ? [jobMins] : [])])]
    .sort((a, b) => a - b)
    .map((value) => ({ value, label: formatDuration(value) }));

export const initials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/** "09:30" (24h) → "9:30 AM" */
export const formatTime = (hhmm: string) => {
  const [hours = 0, minutes = 0] = hhmm.split(':').map(Number);
  const suffix = hours < 12 ? 'AM' : 'PM';
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${suffix}`;
};

/** Weekday indexes (0 = Mon) → "Mon–Sat", "Mon, Wed, Fri" or "Every day" */
export const formatDays = (days: number[]) => {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  if (sorted.length === 7) return 'Every day';
  const runs: number[][] = [];
  for (const day of sorted) {
    const run = runs.at(-1);
    if (run && day === (run.at(-1) ?? -2) + 1) run.push(day);
    else runs.push([day]);
  }
  return runs
    .map((run) => (run.length >= 3 ? `${WEEKDAY_SHORT[run[0] ?? 0]}–${WEEKDAY_SHORT[run.at(-1) ?? 0]}` : run.map((d) => WEEKDAY_SHORT[d]).join(', ')))
    .join(', ');
};

/** Metres → "500 m", "2 km" or "2.5 km" */
export const formatDistance = (metres: number) =>
  metres < 1000 ? `${metres} m` : `${+(metres / 1000).toFixed(1)} km`;

/** ISO date-time → "28 Oct" */
export const formatShortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

/** First name for greetings, e.g. "Asha Kumar" → "Asha" */
export const firstName = (name: string | null) => name?.trim().split(/\s+/)[0] || 'there';

/** ISO date-time → "4:05 PM", or "28 Oct, 4:05 PM" when not today */
export const formatClock = (iso: string) => {
  const date = new Date(iso);
  const time = date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  return date.toDateString() === new Date().toDateString() ? time : `${formatShortDate(iso)}, ${time}`;
};

/**
 * A query's result as a section's state: loading, failed with Retry, or ready with what `ready` builds from the
 * data. Saves writing the same three branches in every screen.
 */
export const toStatus = <D, T extends object>(
  query: { data?: D; isLoading: boolean; error?: unknown; refetch: () => unknown },
  ready: (data: D) => T,
): WithStatus<T> => {
  if (query.isLoading) return { status: 'loading' };
  if (query.data === undefined) {
    return { status: 'error', message: apiErrorMessage(query.error), onRetry: () => void query.refetch() };
  }
  return { status: 'ready', ...ready(query.data) };
};

/** "/jobs/{{id}}" + { id: "42" } → "/jobs/42"; values are URL-encoded. A missing value is a bug, so it throws. */
export const replaceUrlPlaceholders = (url: string, params: Record<string, string | number>) =>
  url.replace(/\{\{(\w+)\}\}/g, (_, name: string) => {
    if (!(name in params)) throw new Error(`Missing "${name}" for ${url}`);
    return encodeURIComponent(String(params[name]));
  });
