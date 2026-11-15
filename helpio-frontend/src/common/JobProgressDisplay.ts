import type { BadgeTone } from '@/components/ui';
import { formatClock, formatINR } from '@/lib/utils';
import type { StageAttempt } from '@/pages/jobs/types/jobs.dto';
import type { JobEvent, Milestone, MilestoneSubmission } from './CommonDto';
import { JobEventType, MilestoneStatus } from './CommonEnum';

/* How a hired job's four stages and its timeline read, for the customer and the hired pro. */

export type ProgressRole = 'customer' | 'provider';

export const STAGE_TITLE: Record<number, string> = {
  1: 'First quarter (25%)',
  2: 'Half way (50%)',
  3: 'Three quarters (75%)',
  4: 'Finished (100%)',
};

export const stageBadge = (m: Milestone, current: boolean, role: ProgressRole): { label: string; tone: BadgeTone } => {
  switch (m.status) {
    case MilestoneStatus.APPROVED:
      return { label: 'Approved', tone: 'success' };
    case MilestoneStatus.SUBMITTED:
      return role === 'customer' ? { label: 'Needs your approval', tone: 'warning' } : { label: 'Waiting for approval', tone: 'warning' };
    case MilestoneStatus.CHANGES_REQUESTED:
      return role === 'customer' ? { label: 'Sent back', tone: 'error' } : { label: 'Changes requested', tone: 'error' };
    default:
      return current ? { label: role === 'provider' ? 'Your turn' : 'In progress', tone: 'brand' } : { label: 'Not started', tone: 'neutral' };
  }
};

/** 20 → "20 min", 135 → "2 hr 15 min" */
export const formatSpan = (mins: number) => {
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  return [hours && `${hours} hr`, (rest || !hours) && `${rest} min`].filter(Boolean).join(' ');
};

const minutesBetween = (from: string | number, to: string | number) =>
  Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60_000);

/** "early"/"late" against the target, for a stage that's been sent or approved */
const versusTarget = (at: string, dueAt: string) => {
  const diff = minutesBetween(dueAt, at);
  if (Math.abs(diff) < 1) return { text: 'on time', late: false };
  return diff > 0 ? { text: `${formatSpan(diff)} late`, late: true } : { text: `${formatSpan(-diff)} early`, late: false };
};

export const stageTiming = (m: Milestone, now: number, open: boolean): { text: string; late: boolean } | null => {
  if (!m.dueAt) return null;
  const last = m.submissions.at(-1);
  if (m.status === MilestoneStatus.APPROVED && m.approvedAt) {
    // Measured by the first time the work was sent: fixing after that is the pro's own time
    const firstSent = m.submissions[0]?.submittedAt ?? m.approvedAt;
    const vs = versusTarget(firstSent, m.dueAt);
    return { text: `Approved ${formatClock(m.approvedAt)} · sent ${vs.text}`, late: vs.late };
  }
  if (m.status === MilestoneStatus.SUBMITTED && last) {
    const vs = versusTarget((m.submissions[0] ?? last).submittedAt, m.dueAt);
    return { text: `Sent ${formatClock(last.submittedAt)} · ${vs.text}`, late: vs.late };
  }
  const left = minutesBetween(now, m.dueAt);
  if (!open) return { text: `Target ${formatClock(m.dueAt)}`, late: false };
  return left >= 0
    ? { text: `Due by ${formatClock(m.dueAt)} · in ${formatSpan(left)}`, late: false }
    : { text: `Overdue by ${formatSpan(-left)} (target ${formatClock(m.dueAt)})`, late: true };
};

export const fixingLabel = (mins: number) => (mins > 0 ? `+${formatSpan(mins)} fixing (not charged)` : null);

export const toAttempt = (s: MilestoneSubmission): StageAttempt => ({
  id: s.id,
  note: s.note,
  photos: s.photos,
  submittedLabel: `Sent ${formatClock(s.submittedAt)}`,
  review:
    s.reviewStatus === MilestoneStatus.APPROVED
      ? { label: `Approved${s.reviewedAt ? ` ${formatClock(s.reviewedAt)}` : ''}`, tone: 'success', note: null }
      : s.reviewStatus === MilestoneStatus.CHANGES_REQUESTED
        ? { label: 'Changes requested', tone: 'error', note: s.reviewNote }
        : { label: 'Waiting for approval', tone: 'warning', note: null },
});

export const eventText = (e: JobEvent) => {
  const who = e.actorLabel ?? 'Someone';
  const pct = e.stage ? `${e.stage * 25}%` : '';
  switch (e.type) {
    case JobEventType.HIRED:
      return `${who} accepted the quote`;
    case JobEventType.STARTED:
      return `${who} started work with the PIN`;
    case JobEventType.MILESTONE_SUBMITTED:
      return `${who} sent the ${pct} update`;
    case JobEventType.MILESTONE_APPROVED:
      return `${who} approved ${pct}`;
    case JobEventType.CHANGES_REQUESTED:
      return `${who} asked for changes on ${pct}`;
    case JobEventType.STAGE_OVERDUE:
      return `The ${pct} update is overdue`;
    case JobEventType.PAYMENT_FAILED:
      return "A payment didn't go through";
    case JobEventType.PAID:
      return `${who} paid ${e.amount !== null ? formatINR(e.amount) : 'for the job'}`;
    case JobEventType.REVIEWED:
      return `${who} left a ${e.rating ?? ''}/5 review`;
    default:
      return 'Job completed';
  }
};
