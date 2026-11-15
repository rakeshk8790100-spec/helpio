import type { ComponentProps } from 'react';
import type { JobCard } from '@/components/common';
import { formatDuration, formatINR, formatShortDate } from '@/lib/utils';
import type { Job, NearbyJob } from './CommonDto';
import { JobStatus, MilestoneStatus } from './CommonEnum';
import { JOB_STATUS_BADGE, plural } from './CommonLabels';
import type { Badge } from './CommonLabels';

/* How a job reads in lists and headers, shared by the customer home, My jobs and the job pages. */

/** A customer's job as a list card */
export type JobItem = ComponentProps<typeof JobCard> & { id: string };

/** How often a job page checks for news: fast while quotes come in or the pro is on the way, slower during the work */
export const livePollMs = (status: JobStatus | undefined) => {
  if (status === JobStatus.OPEN || status === JobStatus.ACCEPTED) return 15_000;
  if (status === JobStatus.IN_PROGRESS || status === JobStatus.PAYMENT_DUE) return 30_000;
  return 0;
};


/**
 * Open jobs with quotes show the count instead of "Waiting for quotes";
 * jobs in progress show what's approved, or that an update is waiting for the customer.
 */
export const jobBadge = (
  job: Pick<Job, 'status' | 'quoteCount'> & Partial<Pick<Job, 'milestoneStatus' | 'progressPct'>>,
): Badge => {
  if (job.status === JobStatus.OPEN && job.quoteCount > 0) return { label: plural(job.quoteCount, 'quote'), tone: 'brand' };
  if (job.status === JobStatus.IN_PROGRESS && job.milestoneStatus === MilestoneStatus.SUBMITTED) {
    return { label: 'Approval needed', tone: 'warning' };
  }
  if (job.status === JobStatus.IN_PROGRESS && job.progressPct) return { label: `${job.progressPct}% done`, tone: 'brand' };
  return JOB_STATUS_BADGE[job.status];
};

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
