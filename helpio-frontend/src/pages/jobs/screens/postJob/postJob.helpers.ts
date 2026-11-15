import type { JobDetail } from '@/common/CommonDto';
import type { JobDraftSuggestion, PostJobFormValues } from './types/postJob.dto';
import { WhenDay, WhenSlot } from './types/postJob.enum';

/* Post job: pure helpers for the "when" chips and for prefilling the form. */

/** Each time-of-day choice starts at this hour */
const SLOT_HOURS: Record<WhenSlot, number> = { morning: 9, afternoon: 13, evening: 17 };

export const SLOT_LABELS: Record<WhenSlot, string> = { morning: 'Morning 9 AM', afternoon: 'Afternoon 1 PM', evening: 'Evening 5 PM' };

export const SLOTS = [WhenSlot.MORNING, WhenSlot.AFTERNOON, WhenSlot.EVENING];

// An unrounded time this close to now was "as soon as possible"
const ASAP_WINDOW_MS = 3 * 60 * 60_000;

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar day "YYYY-MM-DD" */
export const localDay = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

/** Today's slots that haven't started yet */
export const slotsLeftToday = () => SLOTS.filter((slot) => SLOT_HOURS[slot] > new Date().getHours());

/** The form's day and slot → ISO date-time; nothing picked means flexible (null) */
export const toSchedule = ({ whenDay, whenDate, whenSlot }: PostJobFormValues): string | null => {
  if (!whenDay) return null;
  if (whenDay === WhenDay.ASAP) return new Date().toISOString();
  const now = new Date();
  const day = whenDay === WhenDay.TODAY ? now : whenDay === WhenDay.TOMORROW ? addDays(now, 1) : whenDate ? new Date(`${whenDate}T00:00`) : null;
  if (!day) return null;
  day.setHours(SLOT_HOURS[whenSlot ?? WhenSlot.MORNING], 0, 0, 0);
  return day.toISOString();
};

/** A saved time → the form's day and slot. A time that has passed is dropped, so the customer picks again. */
export const fromSchedule = (iso: string | null): Partial<PostJobFormValues> => {
  if (!iso) return {};
  const date = new Date(iso);
  const now = new Date();
  if (date.getTime() < now.getTime() - 5 * 60_000) return {};
  const onSlot = date.getMinutes() === 0 && Object.values(SLOT_HOURS).includes(date.getHours());
  if (!onSlot && date.getTime() - now.getTime() < ASAP_WINDOW_MS) return { whenDay: WhenDay.ASAP };
  const hour = date.getHours();
  const whenSlot = hour < 12 ? WhenSlot.MORNING : hour < 16 ? WhenSlot.AFTERNOON : WhenSlot.EVENING;
  const day = localDay(date);
  if (day === localDay(now)) return { whenDay: WhenDay.TODAY, whenSlot };
  if (day === localDay(addDays(now, 1))) return { whenDay: WhenDay.TOMORROW, whenSlot };
  return { whenDay: WhenDay.DATE, whenDate: day, whenSlot };
};

export const fromDraft = (job: JobDetail | undefined, params: URLSearchParams): Partial<PostJobFormValues> => ({
  title: job?.title ?? undefined,
  description: job?.description ?? undefined,
  categoryId: job?.categoryId ?? params.get('category') ?? undefined,
  pincode: job?.pincode ?? undefined,
  areaName: job?.areaName ?? undefined,
  addressLine: job?.addressLine ?? undefined,
  ...fromSchedule(job?.scheduledAt ?? null),
  durationMins: job?.durationMins ?? undefined,
  budget: job?.budget ?? undefined,
  isEmergency: job?.isEmergency ?? params.get('emergency') === '1',
});

/** The assistant's draft → form values; a category the customer already chose (from search or a pro) wins */
export const fromSuggestion = (s: JobDraftSuggestion, presetCategory: string | null): Partial<PostJobFormValues> => ({
  title: s.title,
  description: s.description,
  categoryId: presetCategory ?? s.categoryId ?? undefined,
  durationMins: s.durationMins ?? undefined,
  isEmergency: s.isEmergency,
  ...(s.isEmergency && { whenDay: WhenDay.ASAP }),
});
