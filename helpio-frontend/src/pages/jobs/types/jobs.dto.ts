import type { JobApiDto, MapCircleApiDto, NearbyJobApiDto, QuoteApiDto } from '../../../common/CommonApi';
import type { Coordinates, RatingSummary } from '../../../common/CommonDto';
import type {
  InviteStatus,
  JobEventType,
  JobStatus,
  MilestoneStatus,
  PaymentAttemptStatus,
  PaymentStatus,
  PayoutStatus,
  Proficiency,
  UserRole,
} from '../../../common/CommonEnum';

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

export interface NearbyJobDetailApiDto extends NearbyJobApiDto {
  attachments: AttachmentApiDto[];
  can_quote: boolean;
  hired: boolean;
  exact_location: {
    latitude: number | null;
    longitude: number | null;
    pincode: string | null;
    area_name: string | null;
    address_line: string | null;
  } | null;
  customer_name: string | null;
  started_at: string | null;
  unread_messages: number;
  customer_rating: RatingSummary;
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

export interface ProviderJobApiDto extends NearbyJobApiDto {
  customer_name: string | null;
  started_at: string | null;
  amount_paise: number;
  earned_paise: number;
  milestone_stage: number | null;
  milestone_status: MilestoneStatus | null;
  next_due_at: string | null;
  unread_messages: number;
}

export interface NearbyJobsApiDto {
  area: MapCircleApiDto | null;
  categories: { id: string; name: string }[];
  jobs: NearbyJobApiDto[];
}

/** Everything the customer fills in; drafts may leave fields empty */
export interface JobInput {
  title?: string;
  description?: string | null;
  categoryId?: string | null;
  coordinates?: Coordinates | null;
  pincode?: string | null;
  areaName?: string | null;
  /** Flat, building and street; only the hired pro sees it */
  addressLine?: string | null;
  /** ₹ */
  budget?: number | null;
  /** ISO date-time with timezone */
  scheduledAt?: string | null;
  durationMins?: number | null;
  isEmergency?: boolean;
  /** true posts the job to nearby providers */
  submit: boolean;
}

/** A first draft of the post form from the customer's own words */
export interface AssistJobApiDto {
  title: string;
  category_id: string | null;
  description: string;
  duration_mins: number | null;
  is_emergency: boolean;
  source: 'ai' | 'keywords';
}

export interface JobDraftSuggestion {
  title: string;
  categoryId: string | null;
  description: string;
  durationMins: number | null;
  isEmergency: boolean;
  /** "ai" when Claude wrote it */
  source: 'ai' | 'keywords';
}

export interface NearbyFilters {
  categoryId?: string;
  maxKm?: number;
  hasBudget?: boolean;
  urgentOnly?: boolean;
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

export interface ChatApiDto {
  job_id: string;
  job_title: string;
  other_name: string;
  other_avatar_url: string | null;
  messages: { id: string; body: string; mine: boolean; sender_name: string; created_at: string }[];
}
