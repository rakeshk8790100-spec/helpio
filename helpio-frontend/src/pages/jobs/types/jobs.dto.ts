import type { ComponentProps } from 'react';
import type { JobApiDto, QuoteApiDto } from '@/common/CommonApi';
import type { JobAttachment } from '@/common/CommonDto';
import type { WithStatus } from '@/common/CommonDto';
import type { InviteStatus, JobEventType, JobStatus, MilestoneStatus, PaymentAttemptStatus, PaymentStatus, PayoutStatus, Proficiency, UserRole } from '@/common/CommonEnum';
import type { PhotoPicker, TrackerStage } from '@/components/common';
import type { BadgeTone, ChipOption } from '@/components/ui';

/* Wire format (snake_case, money in paise) of /jobs/*. App-side inputs are in ₹ and camelCase. */

export interface AttachmentApiDto {
  id: string;
  content_type: string;
  url: string;
}

export interface CustomerQuoteApiDto extends QuoteApiDto {
  provider_id: string;
  provider_label: string;
  avatar_url: string | null;
  proficiency: Proficiency | null;
  years_experience: number | null;
  approx_distance_km: number | null;
}

export interface InviteApiDto {
  provider_id: string;
  provider_label: string;
  avatar_url: string | null;
  status: InviteStatus;
}

export interface JobDetailApiDto extends JobApiDto {
  attachments: AttachmentApiDto[];
  quotes: CustomerQuoteApiDto[];
  invites: InviteApiDto[];
  hired: { provider_id: string; provider_label: string; avatar_url: string | null; amount_paise: number } | null;
  start_pin: string | null;
  pin_locked: boolean;
  started_at: string | null;
  unread_messages: number;
}

export interface MilestoneSubmissionApiDto {
  id: string;
  note: string;
  photos: AttachmentApiDto[];
  submitted_at: string;
  review_status: MilestoneStatus;
  review_note: string | null;
  reviewed_at: string | null;
}

export interface MilestonesApiDto {
  job_id: string;
  job_title: string;
  job_status: JobStatus;
  progress_pct: number;
  amount_paise: number;
  earned_paise: number;
  current_stage: number | null;
  estimated_mins: number | null;
  started_at: string | null;
  extra_mins_total: number;
  milestones: {
    stage: number;
    percent: number;
    status: MilestoneStatus;
    amount_paise: number;
    approved_at: string | null;
    due_at: string | null;
    extra_mins: number;
    submissions: MilestoneSubmissionApiDto[];
  }[];
  events: {
    id: string;
    type: JobEventType;
    actor_label: string | null;
    data: { stage?: number; reason?: string; amount_paise?: number; rating?: number };
    created_at: string;
  }[];
}

export interface JobPaymentApiDto {
  job_id: string;
  job_status: JobStatus;
  amount_paise: number;
  payment_id: string | null;
  status: PaymentStatus | null;
  last_error: string | null;
  expires_at: string | null;
  paid_at: string | null;
  method: string | null;
  attempts: {
    id: string;
    status: PaymentAttemptStatus;
    method: string | null;
    amount_paise: number;
    error_description: string | null;
    attempted_at: string;
  }[];
  payout: { status: PayoutStatus; reference: string | null; sent_at: string | null } | null;
  can_pay: boolean;
}

/** The query string Razorpay adds when it sends the customer back after paying */
export interface PaymentReturn {
  razorpay_payment_id: string;
  razorpay_payment_link_id: string;
  razorpay_payment_link_reference_id: string;
  razorpay_payment_link_status: string;
  razorpay_signature: string;
}

export interface JobReviewApiDto {
  id: string;
  rating: number;
  comment: string | null;
  reviewer_label: string;
  reviewer_role: UserRole;
  created_at: string;
}

export interface JobReviewsApiDto {
  can_review: boolean;
  mine: JobReviewApiDto | null;
  theirs: JobReviewApiDto | null;
}

/* Contract between pages/jobs (behaviour) and client/default/jobs (markup): posting, My jobs, job hub, provider search and quoting. */

// ----- Progress: four 25% stages (customer and hired pro) -----

/** How long the whole job should take; each 25% stage gets a quarter of it */
export interface EstimatePickerProps {
  options: ChipOption<number>[];
  value: number | null;
  onChange: (minutes: number) => void;
}

export interface StageAttempt {
  id: string;
  note: string;
  photos: JobAttachment[];
  /** e.g. "Sent 4:05 PM" */
  submittedLabel: string;
  review: { label: string; tone: BadgeTone; note: string | null };
}

export interface StageItem {
  stage: number;
  percent: number;
  /** e.g. "Half way (50%)" */
  title: string;
  /** This stage's share of the quote, ₹ */
  amount: number;
  badge: { label: string; tone: BadgeTone };
  /** e.g. "Target 4:45 PM", "Approved 4:40 PM · 5 min early"; red when late */
  timing: { text: string; late: boolean } | null;
  /** e.g. "+20 min fixing (not charged)" */
  fixingLabel: string | null;
  /** Oldest first */
  attempts: StageAttempt[];
  /** The first stage not yet approved */
  current: boolean;
}

export interface StageSubmitProps {
  stage: number;
  percent: number;
  /** The customer's reason, when they sent the last update back */
  changesNote: string | null;
  photos: ComponentProps<typeof PhotoPicker>;
  note: string;
  onNoteChange: (value: string) => void;
  submitting: boolean;
  error?: string;
  onSubmit: () => void;
}

export interface StageReviewProps {
  stage: number;
  percent: number;
  /** ₹ this approval releases */
  amount: number;
  proName: string;
  attempt: StageAttempt;
  approving: boolean;
  onApprove: () => void;
  changes: {
    open: boolean;
    onOpen: () => void;
    onCancel: () => void;
    reason: string;
    onReasonChange: (value: string) => void;
    sending: boolean;
    error?: string;
    onSend: () => void;
  };
}

export type JobProgressProps = WithStatus<{
  progressPct: number;
  tracker: TrackerStage[];
  /** e.g. "₹250 of ₹1,000 approved" */
  earnedLabel: string;
  /** What happens next, in plain words */
  headline: string;
  /** e.g. "Estimate 3 hr · started 4:00 PM · finish by 7:00 PM" */
  scheduleLabel: string | null;
  /** The open stage's countdown, e.g. "25% due by 4:45 PM · in 20 min"; red when overdue */
  currentTiming: { text: string; late: boolean } | null;
  /** e.g. "+20 min fixing so far (not charged)" */
  fixingLabel: string | null;
  /** Hired pro, job started before estimates existed: set it once */
  setEstimate: { picker: EstimatePickerProps; saving: boolean; onSave: () => void } | null;
  /** Hired pro: the open stage's update form */
  submit: StageSubmitProps | null;
  /** Customer: an update waiting for approval */
  review: StageReviewProps | null;
  stages: StageItem[];
  /** Newest first */
  timeline: { id: string; text: string; detail: string | null; time: string }[];
}>;

// ----- After 100%: paying on Razorpay, and one review each way -----

export interface PaymentTry {
  id: string;
  /** e.g. "Failed", "Paid" */
  badge: { label: string; tone: BadgeTone };
  /** e.g. "UPI · 4:05 PM" */
  meta: string;
  /** Razorpay's reason when it failed */
  reason: string | null;
}

export type JobPaymentProps = WithStatus<{
  /** due: the customer's turn; waiting: the pro waits for the customer; done: paid */
  tone: 'due' | 'waiting' | 'done';
  /** e.g. "Pay ₹1,500 to finish" */
  title: string;
  badge: { label: string; tone: BadgeTone };
  /** What happens next, in plain words */
  text: string;
  /** Customer: Razorpay's reason the last try failed, while the payment is still open */
  lastError: string | null;
  /** Customer, while the job waits for payment: off to Razorpay's page */
  pay: { label: string; starting: boolean; onPay: () => void } | null;
  /** Back from Razorpay: the payment is being checked */
  confirming: boolean;
  /** Customer, after a failed try: every try, oldest first */
  tries: PaymentTry[];
}>;

export interface ReviewView {
  rating: number;
  comment: string | null;
  /** e.g. "Your review · 28 Oct" or "Ravi S. rated you · 28 Oct" */
  caption: string;
}

export type JobReviewProps = WithStatus<{
  /** e.g. "How did Ravi S. do?" */
  title: string;
  /** Until I've reviewed: pick stars, add a comment, send once */
  form: {
    hint: string;
    rating: number;
    onRatingChange: (value: number) => void;
    comment: string;
    onCommentChange: (value: string) => void;
    maxLength: number;
    sending: boolean;
    error?: string;
    onSend: () => void;
  } | null;
  mine: ReviewView | null;
  /** The other side's review of me */
  theirs: ReviewView | null;
  /** e.g. "Ravi S. hasn't reviewed you yet." */
  waitingText: string | null;
}>;

// ----- A job's header (customer and hired pro) -----

export interface JobSummary {
  title: string;
  badge: { label: string; tone: BadgeTone };
  isEmergency: boolean;
  /** Changed after posting (for a provider: after their quote) */
  edited: boolean;
  /** Plain facts, e.g. ["Plumbing", "Indiranagar 560038", "Tue 28 Oct, 4:00 PM", "2 hr", "Budget ₹800"] */
  facts: string[];
  description: string | null;
  photos: JobAttachment[];
}
