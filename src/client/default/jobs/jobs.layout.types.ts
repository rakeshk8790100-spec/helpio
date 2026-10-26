import type { ComponentProps } from 'react';
import type { FormInstance } from 'antd';
import type { Coordinates, CustomerQuote, HiredPro, JobAttachment, JobInvite, MapCircle, NearbyJob, JobQuote } from '../../../common/CommonDto';
import type { BadgeTone, ChipOption } from '../../../component/ui';
import type { ChatBubble, CurrentLocationButton, JobMapItem, PhotoPicker } from '../../../component/marketplace';
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
  quotes: {
    items: {
      quote: CustomerQuote;
      cheapest: boolean;
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

export interface NearbyJobsLayoutProps {
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
  summary: JobSummary & { customerLabel: string; quoteCount: number };
  /** The customer asked this pro directly */
  invite: { message: string | null; declining: boolean; onDecline: () => void } | null;
  /** My quote was accepted: the customer's name and the exact place */
  hired: {
    customerName: string;
    address: string;
    coordinates: Coordinates | null;
    /** Until work starts: enter the customer's PIN */
    start: { pin: string; onPinChange: (pin: string) => void; starting: boolean; error?: string; onStart: () => void } | null;
    /** e.g. "In progress since 4:05 PM" */
    startedLabel: string | null;
    chat: { unread: number; onOpen: () => void };
  } | null;
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
