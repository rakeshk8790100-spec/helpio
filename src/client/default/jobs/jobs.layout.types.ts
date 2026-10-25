import type { ComponentProps } from 'react';
import type { FormInstance } from 'antd';
import type { CustomerQuote, JobAttachment, MapCircle, NearbyJob, JobQuote } from '../../../common/CommonDto';
import type { BadgeTone, ChipOption } from '../../../component/ui';
import type { CurrentLocationButton, JobMapItem, PhotoPicker } from '../../../component/marketplace';
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

export type PostJobLayoutProps = WithLoading<{
  /** Editing a saved draft rather than starting fresh */
  editingDraft: boolean;
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
  /** Plain facts, e.g. ["Plumbing", "Indiranagar 560038", "Tue 28 Oct, 4:00 PM", "2 hr", "Budget ₹800"] */
  facts: string[];
  description: string | null;
  photos: JobAttachment[];
}

export type JobDetailLayoutProps = WithStatus<{
  summary: JobSummary;
  /** Shown instead of quotes while the job is a draft */
  draft: { onContinue: () => void } | null;
  quotes: {
    items: { quote: CustomerQuote; cheapest: boolean }[];
    /** Why accepting isn't possible yet */
    lockedNote: string;
  } | null;
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
  | { state: 'sent'; quote: JobQuote; withdrawing: boolean; onWithdraw: () => void }
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
  circle: MapCircle | null;
  quote: ProviderQuoteProps;
  onBack: () => void;
}>;
