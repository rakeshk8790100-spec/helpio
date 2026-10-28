import type { ComponentProps } from 'react';
import type { FormInstance } from 'antd';
import type { Coordinates, CustomerQuote, HiredPro, JobAttachment, JobInvite, MapCircle, NearbyJob, JobQuote } from '../../../common/CommonDto';
import type { BadgeTone, ChipOption } from '../../../component/ui';
import type { ChatBubble, CurrentLocationButton, HiredJobCard, JobMapItem, PhotoPicker, TrackerStage } from '../../../component/marketplace';
import type { JobItem } from '../home/home.layout.types';
import type { WithLoading, WithStatus } from '../layout.types';

/* Contract between pages/jobs (behaviour) and client/default/jobs (markup): posting, My jobs, job hub, provider search and quoting. */

// ----- Customer: post a job -----

export interface PostJobFormValues {
  title: string;
  description?: string;
  categoryId?: string;
  pincode?: string;
  areaName?: string;
  /** "YYYY-MM-DDTHH:mm" from a datetime-local input */
  when?: string;
  durationMins?: number;
  /** ₹ */
  budget?: number;
  isEmergency: boolean;
}

export type PostJobMode = 'new' | 'draft' | 'edit';

export type PostJobLayoutProps = WithLoading<{
  /** A new job, a saved draft, or a posted job being changed */
  mode: PostJobMode;
  /** Posting for a chosen pro: the job is sent to them once posted */
  invitee: string | null;
  /** Saved addresses as quick picks; `selectedId` null means "somewhere else" */
  addresses: { items: { id: string; label: string }[]; selectedId: string | null; onSelect: (id: string | null) => void } | null;
  form: FormInstance<PostJobFormValues>;
  initialValues: Partial<PostJobFormValues>;
  categories: ChipOption<string>[];
  location: ComponentProps<typeof CurrentLocationButton>;
  onImprove: () => void;
  photos: ComponentProps<typeof PhotoPicker>;
  /** Which button is busy */
  saving: 'draft' | 'post' | null;
  error?: string;
  onSaveDraft: () => void;
  onPost: () => void;
  /** Edit mode: leave without saving */
  onCancel: () => void;
}>;

// ----- Customer: My jobs -----

export const JobsTab = {
  DRAFTS: 'drafts',
  OPEN: 'open',
  ACTIVE: 'active',
  PAST: 'past',
} as const;
export type JobsTab = (typeof JobsTab)[keyof typeof JobsTab];

export interface MyJobsLayoutProps {
  tab: JobsTab;
  tabs: { value: JobsTab; label: string }[];
  onTabChange: (tab: JobsTab) => void;
  jobs: WithStatus<{ items: JobItem[]; emptyText: string }>;
  onPostJob: () => void;
}

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

// ----- Customer: one job -----

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

export type JobDetailLayoutProps = WithStatus<{
  summary: JobSummary;
  /** Shown instead of quotes while the job is a draft */
  draft: { onContinue: () => void } | null;
  /** Posted and nobody hired yet; `hasQuotes` adds a note that quoters will see the change */
  edit: { onEdit: () => void; hasQuotes: boolean } | null;
  /** The pro the customer hired, and what happens next */
  hired: {
    pro: HiredPro;
    nextStep: string;
    onOpen: () => void;
    /** Until work starts: the PIN to share at the door */
    pin: { value: string; resetting: boolean; onReset: () => void } | null;
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

// ----- Provider: nearby jobs -----

export const JobsView = { LIST: 'list', MAP: 'map' } as const;
export type JobsView = (typeof JobsView)[keyof typeof JobsView];

export interface NearbyFiltersProps {
  categories: ChipOption<string>[];
  categoryId: string;
  onCategoryChange: (id: string) => void;
  distances: ChipOption<number>[];
  maxKm: number;
  onMaxKmChange: (km: number) => void;
  hasBudget: boolean;
  onHasBudgetChange: (on: boolean) => void;
  urgentOnly: boolean;
  onUrgentOnlyChange: (on: boolean) => void;
}

export const ProJobsTab = { NEW: 'new', ACTIVE: 'active', COMPLETED: 'completed' } as const;
export type ProJobsTab = (typeof ProJobsTab)[keyof typeof ProJobsTab];

export type HiredJobItem = ComponentProps<typeof HiredJobCard> & { id: string };

export interface NearbyJobsLayoutProps {
  tab: ProJobsTab;
  tabs: { value: ProJobsTab; label: string }[];
  onTabChange: (tab: ProJobsTab) => void;
  /** Active and Completed tabs: jobs I was hired for */
  hired: WithStatus<{ items: HiredJobItem[]; emptyText: string }>;
  filters: NearbyFiltersProps;
  view: JobsView;
  onViewChange: (view: JobsView) => void;
  results: WithStatus<{
    items: { job: NearbyJob; onOpen: () => void }[];
    map: { area: MapCircle | null; jobs: JobMapItem[] };
    /** The provider saved no coordinates, so the map can't place them */
    noLocation: { onAddLocation: () => void } | null;
  }>;
}

// ----- Provider: one nearby job and the quote form -----

export interface QuoteFormValues {
  /** ₹ */
  amount: number;
  message?: string;
}

/** Locked until sign-up is done, then a form, then the sent quote (withdrawable while pending) */
export type ProviderQuoteProps =
  | { state: 'locked'; reason: string; actionLabel: string; onAction: () => void }
  | { state: 'sent'; quote: JobQuote; changedSince: boolean; withdrawing: boolean; onWithdraw: () => void }
  | {
      state: 'form';
      form: FormInstance<QuoteFormValues>;
      initialValues: Partial<QuoteFormValues>;
      budget: number | null;
      onSameAsBudget: () => void;
      quickMessages: string[];
      onQuickMessage: (text: string) => void;
      submitting: boolean;
      error?: string;
      onSubmit: (values: QuoteFormValues) => void;
    };

export type ProviderJobLayoutProps = WithStatus<{
  summary: JobSummary & {
    customerLabel: string;
    quoteCount: number;
    /** How other pros rated this customer; null before any review */
    customerRating: { average: number; count: number } | null;
  };
  /** The customer asked this pro directly */
  invite: { message: string | null; declining: boolean; onDecline: () => void } | null;
  /** My quote was accepted: the customer's name and the exact place */
  hired: {
    customerName: string;
    address: string;
    coordinates: Coordinates | null;
    /** Until work starts: enter the customer's PIN */
    start: {
      pin: string;
      onPinChange: (pin: string) => void;
      estimate: EstimatePickerProps;
      starting: boolean;
      error?: string;
      onStart: () => void;
    } | null;
    /** e.g. "In progress since 4:05 PM" */
    startedLabel: string | null;
    chat: { unread: number; onOpen: () => void };
  } | null;
  /** After hire: the four stages, the update form and the timeline */
  progress: JobProgressProps | null;
  /** All four stages approved: the customer's payment, then Helpio's transfer to me */
  payment: JobPaymentProps | null;
  /** All four stages approved: rate the customer, and see their rating of me */
  review: JobReviewProps | null;
  circle: MapCircle | null;
  quote: ProviderQuoteProps;
  onBack: () => void;
}>;

// ----- Chat between the customer and the hired pro -----

export type JobChatLayoutProps = WithStatus<{
  title: string;
  otherName: string;
  otherAvatarUrl: string | null;
  messages: ChatBubble[];
  draft: string;
  onDraftChange: (value: string) => void;
  sending: boolean;
  error?: string;
  onSend: () => void;
  onBack: () => void;
}>;
