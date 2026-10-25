export const formatINR = (amount: number) =>
  `₹${amount.toLocaleString('en-IN')}`;

export const formatDuration = (mins: number) =>
  mins < 60 ? `${mins} min` : `${+(mins / 60).toFixed(1)} hr`;

export const initials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

/**
 * Placeholder for the AI job-description helper: expands a short note into a structured brief.
 * Replace with the real AI endpoint once available.
 */
export const draftJobDescription = (text: string) =>
  `I need help with: ${text.trim()}.\n\n` +
  `• What's wrong: \n• Since when: \n• Preferred date/time: \n• Access notes (parking, floor, pets): \n\n` +
  `Please share photos/estimate before starting.`;

export const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/** "09:30" (24h) → "9:30 AM" */
export const formatTime = (hhmm: string) => {
  const [hours, minutes] = hhmm.split(':').map(Number);
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
    if (run && day === run[run.length - 1] + 1) run.push(day);
    else runs.push([day]);
  }
  return runs
    .map((run) => (run.length >= 3 ? `${WEEKDAY_SHORT[run[0]]}–${WEEKDAY_SHORT[run[run.length - 1]]}` : run.map((d) => WEEKDAY_SHORT[d]).join(', ')))
    .join(', ');
};

/** Metres → "500 m", "2 km" or "2.5 km" */
export const formatDistance = (metres: number) =>
  metres < 1000 ? `${metres} m` : `${+(metres / 1000).toFixed(1)} km`;
