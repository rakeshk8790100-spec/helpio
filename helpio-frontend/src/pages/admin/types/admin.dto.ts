import type { ApprovalStatus, JobStatus, MilestoneStatus, OnboardingStatus, PaymentStatus, PayoutStatus, QuoteStatus, UserRole } from '@/common/CommonEnum';
import type { AdminParty, AppSettings } from './admin.models';

/* Wire format (snake_case) of /admin/*. */

export interface AdminApiDto {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  approval_status: ApprovalStatus;
  approval_note: string | null;
  is_active: boolean;
  is_owner: boolean;
  created_at: string;
  approved_at: string | null;
}

export interface ApprovalItemApiDto {
  id: string;
  role: 'customer' | 'provider';
  name: string | null;
  email: string;
  phone: string | null;
  approval_status: ApprovalStatus;
  approval_note: string | null;
  created_at: string;
  provider: {
    onboarding_status: OnboardingStatus;
    skills: string[];
    area_name: string | null;
    pincode: string | null;
    radius_km: number | null;
    work_days: number[];
    bio: string | null;
  } | null;
}

export interface CheckApiDto {
  name: string;
  label: string;
  configured: boolean;
  ok: boolean | null;
  message: string;
  latency_ms: number | null;
  checked_at: string;
}

export interface StatusApiDto {
  env: string;
  version: string;
  started_at: string;
  database: CheckApiDto;
  integrations: CheckApiDto[];
  heartbeats: {
    name: string;
    label: string;
    description: string;
    last_ok_at: string | null;
    last_error_at: string | null;
    last_error: string | null;
    healthy: boolean | null;
  }[];
  email: { sent: number; failed: number; last_ok_at: string | null; last_error_at: string | null; last_error: string | null };
  errors: { id: string; method: string; path: string; error_type: string; message: string; count: number; last_seen: string }[];
  attention: { approvals_waiting: number; payments_stuck: number; payouts_waiting: number; payouts_waiting_paise: number };
}

export interface DashboardApiDto {
  users: {
    customers: number;
    providers: number;
    admins: number;
    pending_customers: number;
    pending_providers: number;
    signups_today: number;
    signups_week: number;
  };
  jobs: { by_status: Record<string, number>; posted_today: number };
  money: {
    payment_due_count: number;
    payment_due_paise: number;
    paid_today_count: number;
    paid_today_paise: number;
    failed_tries_day: number;
    payouts_waiting_count: number;
    payouts_waiting_paise: number;
  };
  reviews: { average: number | null; count: number };
  activity: { id: string; type: string; actor: string | null; job_id: string; job_title: string; data: Record<string, unknown>; at: string }[];
}

/** Field keys are single words, so groups map as they are */
export interface SettingsApiDto {
  groups: AppSettings['groups'];
  can_store_secrets: boolean;
}

export interface UserRowApiDto {
  id: string;
  role: 'customer' | 'provider';
  name: string | null;
  email: string;
  phone: string | null;
  approval_status: ApprovalStatus;
  is_active: boolean;
  created_at: string;
  jobs: number;
  rating_average: number | null;
  rating_count: number;
}

export interface ReviewItemApiDto {
  id: string;
  job_title: string;
  author: string;
  stars: number;
  comment: string | null;
  hidden: boolean;
  created_at: string;
}

export interface UserDetailApiDto extends UserRowApiDto {
  approval_note: string | null;
  approved_at: string | null;
  provider: ApprovalItemApiDto['provider'];
  quotes: Record<string, number>;
  job_list: { id: string; title: string; status: JobStatus; amount_paise: number | null; created_at: string }[];
  reviews_received: ReviewItemApiDto[];
  reviews_given: number;
  payments: { id: string; job_title: string; status: PaymentStatus; amount_paise: number; payout_status: PayoutStatus; paid_at: string | null; created_at: string }[];
  earned_paise: number;
  owed_paise: number;
}

export interface JobRowApiDto {
  id: string;
  title: string;
  status: JobStatus;
  category: string | null;
  area: string | null;
  customer: string;
  pro: string | null;
  amount_paise: number | null;
  progress_pct: number;
  created_at: string;
  updated_at: string;
}

export interface JobDetailApiDto extends JobRowApiDto {
  description: string | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  budget_paise: number | null;
  scheduled_at: string | null;
  is_emergency: boolean;
  started_at: string | null;
  customer_party: AdminParty;
  pro_party: AdminParty | null;
  quotes: { pro: string; amount_paise: number; status: QuoteStatus; message: string | null; created_at: string }[];
  stages: {
    stage: number;
    percent: number;
    status: MilestoneStatus;
    attempts: { note: string; review_status: MilestoneStatus; review_note: string | null; submitted_at: string; photos: string[] }[];
  }[];
  events: { type: string; actor: string | null; data: Record<string, unknown>; at: string }[];
  payments: { id: string; status: PaymentStatus; amount_paise: number; last_error: string | null; tries: number; paid_at: string | null; payout_status: PayoutStatus; payout_reference: string | null }[];
  reviews: ReviewItemApiDto[];
  can_cancel: boolean;
}

export interface PaymentRowApiDto {
  id: string;
  job_id: string;
  job_title: string;
  customer: string;
  pro: string;
  amount_paise: number;
  status: PaymentStatus;
  method: string | null;
  last_error: string | null;
  tries: number;
  failed_tries: number;
  payout_status: PayoutStatus;
  created_at: string;
  paid_at: string | null;
}

export interface PayoutApiDto {
  payment_id: string;
  job_title: string;
  provider_name: string | null;
  provider_email: string;
  provider_phone: string | null;
  amount_paise: number;
  paid_at: string | null;
  payout_status: PayoutStatus;
  payout_reference: string | null;
  payout_at: string | null;
}

export interface ReviewRowApiDto extends ReviewItemApiDto {
  job_id: string;
  author_role: UserRole;
  subject: string;
  hidden_reason: string | null;
}

export interface CategoryApiDto {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
  jobs: number;
  skills: { id: string; name: string; sort_order: number; is_active: boolean; providers: number }[];
}

export interface UserFilters {
  page: number;
  pageSize: number;
  role?: 'customer' | 'provider';
  approval?: ApprovalStatus;
  active?: boolean;
  q?: string;
}

export interface JobFilters {
  page: number;
  pageSize: number;
  status?: JobStatus;
  q?: string;
}

export interface AuditEntryApiDto {
  id: string;
  action: string;
  summary: string;
  actor: string | null;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown>;
  ip: string | null;
  created_at: string;
}

export interface PageApiDto<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface AdminLoginDto {
  email: string;
  password: string;
}

export interface AccessRequestDto {
  name: string;
  email: string;
  /** 10 digits; the API adds +91 */
  phone: string;
  password: string;
}

export interface AuditFilters {
  page: number;
  pageSize: number;
  action?: string;
}
