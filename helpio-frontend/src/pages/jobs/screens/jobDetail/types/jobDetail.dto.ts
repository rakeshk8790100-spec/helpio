import type { CustomerQuote, HiredPro, JobInvite, WithStatus } from '@/common/CommonDto';
import type { JobPaymentProps, JobProgressProps, JobReviewProps, JobSummary } from '@/pages/jobs/types/jobs.dto';

/* The jobDetail screen: wire shapes and layout props. */

export type JobDetailLayoutProps = WithStatus<{
  summary: JobSummary;
  /** Shown instead of quotes while the job is a draft */
  draft: { onContinue: () => void; onDelete: () => void; deleting: boolean } | null;
  /** Posted and nobody hired yet; `hasQuotes` adds a note that quoters will see the change */
  edit: { onEdit: () => void; hasQuotes: boolean } | null;
  /** The pro the customer hired, and what happens next */
  hired: {
    pro: HiredPro;
    nextStep: string;
    onOpen: () => void;
    /** Until work starts: the PIN to share at the door */
    /** `locked`: the pro entered a wrong PIN too often; a new PIN unlocks it */
    pin: { value: string; locked: boolean; resetting: boolean; onReset: () => void } | null;
    /** e.g. "Work started at 4:05 PM" */
    startedLabel: string | null;
    chat: { unread: number; onOpen: () => void };
  } | null;
  /** After hire: the four stages, the update to review and the timeline */
  progress: JobProgressProps | null;
  /** All four stages approved: pay on Razorpay, then the receipt */
  payment: JobPaymentProps | null;
  /** All four stages approved: rate the pro, and see their rating of me */
  review: JobReviewProps | null;
  quotes: {
    items: {
      quote: CustomerQuote;
      cheapest: boolean;
      /** The pro's public profile; unset when the quote has no pro id */
      onOpenPro?: () => void;
      /** Set while the job is open and the quote pending */
      onAccept?: () => void;
      onReject?: () => void;
      acting: 'accept' | 'reject' | null;
    }[];
    /** A quote is being answered: the others wait */
    busy: boolean;
  } | null;
  /** Pros the customer sent this job to directly */
  invites: { invite: JobInvite; onOpen: () => void }[];
  /** Open jobs: find another pro to send it to */
  onFindPros: (() => void) | null;
  onBack: () => void;
}>;
