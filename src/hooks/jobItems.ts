import type { JobItem } from '../client/default/home/home.layout.types';
import type { Job, NearbyJob } from '../common/CommonDto';
import { JobStatus } from '../common/CommonEnum';
import type { BadgeTone } from '../component/ui';
import { formatDuration, formatINR, formatShortDate } from '../lib/utils';

/* How a job reads in lists and headers, shared by the customer home, My jobs and the job pages. */

const STATUS_BADGE: Record<JobStatus, { label: string; tone: BadgeTone }> = {
  [JobStatus.DRAFT]: { label: 'Draft', tone: 'neutral' },
  [JobStatus.OPEN]: { label: 'Waiting for quotes', tone: 'warning' },
  [JobStatus.ACCEPTED]: { label: 'Pro hired', tone: 'success' },
  [JobStatus.FUNDED]: { label: 'Paid into escrow', tone: 'success' },
  [JobStatus.IN_PROGRESS]: { label: 'In progress', tone: 'brand' },
  [JobStatus.COMPLETED]: { label: 'Completed', tone: 'success' },
  [JobStatus.CANCELLED]: { label: 'Cancelled', tone: 'neutral' },
  [JobStatus.DISPUTED]: { label: 'In dispute', tone: 'error' },
};

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

/** Open jobs with quotes show the count instead of "Waiting for quotes" */
export const jobBadge = (job: Pick<Job, 'status' | 'quoteCount'>) =>
  job.status === JobStatus.OPEN && job.quoteCount > 0
    ? { label: plural(job.quoteCount, 'quote'), tone: 'brand' as BadgeTone }
    : STATUS_BADGE[job.status];

export const jobWhere = (job: Pick<Job, 'categoryName' | 'areaName'>) =>
  [job.categoryName, job.areaName].filter(Boolean).join(' · ') || 'Details to add';

/** "Tue 28 Oct, 4:00 PM" */
export const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** Plain facts for a job header: category, place, time, duration, budget */
export const jobFacts = (job: Job | NearbyJob, place: string | null) =>
  [
    job.categoryName,
    place,
    job.scheduledAt && formatWhen(job.scheduledAt),
    'durationMins' in job && job.durationMins ? formatDuration(job.durationMins) : null,
    job.budget !== null ? `Budget ${formatINR(job.budget)}` : 'Open budget',
  ].filter((fact): fact is string => Boolean(fact));

/** One customer job as a list card. Drafts continue editing; everything else opens the job. */
export const toJobItem = (job: Job, open: (job: Job) => void, continueDraft: (job: Job) => void): JobItem => {
  const isDraft = job.status === JobStatus.DRAFT;
  const hasQuotes = job.status === JobStatus.OPEN && job.quoteCount > 0;
  return {
    id: job.id,
    title: job.title,
    meta: isDraft
      ? `Saved ${formatShortDate(job.updatedAt)} · ${jobWhere(job)}`
      : job.status === JobStatus.OPEN && !hasQuotes
        ? `Sent to pros near ${job.areaName ?? 'you'}`
        : jobWhere(job),
    badge: jobBadge(job),
    amount: hasQuotes ? job.lowestQuote : isDraft ? null : job.budget,
    amountLabel: hasQuotes ? 'from' : 'budget',
    urgent: job.isEmergency,
    onClick: () => (isDraft ? continueDraft(job) : open(job)),
  };
};
