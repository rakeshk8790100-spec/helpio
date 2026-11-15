import type { WithStatus, Coordinates } from '@/common/CommonDto';
import type { ApprovalStatus, JobStatus, MilestoneStatus, OnboardingStatus, PaymentStatus, PayoutStatus, QuoteStatus, UserRole } from '@/common/CommonEnum';
import type { BadgeTone } from '@/components/ui';

/* The admin console's app-side shapes (camelCase, ₹), mapped from the wire format in admin.dto.ts. */

/** One numbered page of a long admin list */
export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminAccount {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  approvalStatus: ApprovalStatus;
  /** The owner's reason when rejecting */
  approvalNote: string | null;
  isActive: boolean;
  isOwner: boolean;
  createdAt: string;
  approvedAt: string | null;
}

/** A customer or provider waiting for an admin */
export interface ApprovalItem {
  id: string;
  role: typeof UserRole.CUSTOMER | typeof UserRole.PROVIDER;
  name: string | null;
  email: string;
  phone: string | null;
  approvalStatus: ApprovalStatus;
  approvalNote: string | null;
  createdAt: string;
  /** Providers: what they offer */
  provider: {
    onboardingStatus: OnboardingStatus;
    skills: string[];
    areaName: string | null;
    pincode: string | null;
    radiusKm: number | null;
    /** 0 = Monday */
    workDays: number[];
    bio: string | null;
  } | null;
}

export interface ApprovalCounts {
  customers: number;
  providers: number;
  /** Admin access requests (the owner only) */
  admins: number;
}

/** A live check of one outside service (or the database) */
export interface ServiceCheck {
  name: string;
  label: string;
  configured: boolean;
  /** null: set up, but it can't be checked from here */
  ok: boolean | null;
  message: string;
  latencyMs: number | null;
  checkedAt: string;
}

export interface SystemStatus {
  env: string;
  version: string;
  startedAt: string;
  database: ServiceCheck;
  integrations: ServiceCheck[];
  heartbeats: {
    name: string;
    label: string;
    description: string;
    lastOkAt: string | null;
    lastErrorAt: string | null;
    lastError: string | null;
    /** null: switched off, or nothing has happened yet */
    healthy: boolean | null;
  }[];
  /** This server process's email sends since it started */
  email: { sent: number; failed: number; lastOkAt: string | null; lastErrorAt: string | null; lastError: string | null };
  /** Newest first */
  errors: { id: string; method: string; path: string; errorType: string; message: string; count: number; lastSeen: string }[];
  attention: { approvalsWaiting: number; paymentsStuck: number; payoutsWaiting: number; payoutsWaitingAmount: number };
}

export interface AdminDashboard {
  users: {
    customers: number;
    providers: number;
    admins: number;
    pendingCustomers: number;
    pendingProviders: number;
    signupsToday: number;
    signupsWeek: number;
  };
  jobs: { byStatus: Record<string, number>; postedToday: number };
  /** ₹ */
  money: {
    paymentDueCount: number;
    paymentDueAmount: number;
    paidTodayCount: number;
    paidTodayAmount: number;
    failedTriesDay: number;
    payoutsWaitingCount: number;
    payoutsWaitingAmount: number;
  };
  reviews: { average: number | null; count: number };
  /** Newest first */
  activity: { id: string; type: string; actor: string | null; jobId: string; jobTitle: string; data: Record<string, unknown>; at: string }[];
}

export interface SettingField {
  key: string;
  label: string;
  help: string;
  kind: 'text' | 'secret' | 'int' | 'bool';
  /** Secrets masked ("••••1AIZ") or null when not set */
  value: string | null;
  source: 'panel' | 'env' | 'missing';
  /** Saved here but can't be decrypted: .env is used */
  unreadable: boolean;
}

export interface AppSettings {
  groups: { id: string; title: string; description: string; testable: boolean; fields: SettingField[] }[];
  canStoreSecrets: boolean;
}

/** A customer or provider in the admin console */
export interface AdminUserRow {
  id: string;
  role: typeof UserRole.CUSTOMER | typeof UserRole.PROVIDER;
  name: string | null;
  email: string;
  phone: string | null;
  approvalStatus: ApprovalStatus;
  isActive: boolean;
  createdAt: string;
  /** Customers: jobs posted; providers: jobs hired for */
  jobs: number;
  ratingAverage: number | null;
  ratingCount: number;
}

export interface AdminReviewItem {
  id: string;
  jobTitle: string;
  author: string;
  stars: number;
  comment: string | null;
  hidden: boolean;
  createdAt: string;
}

export interface AdminUserDetail extends AdminUserRow {
  approvalNote: string | null;
  approvedAt: string | null;
  provider: ApprovalItem['provider'];
  /** Providers: quotes by status */
  quotes: Record<string, number>;
  jobList: { id: string; title: string; status: JobStatus; amount: number | null; createdAt: string }[];
  reviewsReceived: AdminReviewItem[];
  reviewsGiven: number;
  payments: { id: string; jobTitle: string; status: PaymentStatus; amount: number; payoutStatus: PayoutStatus; paidAt: string | null; createdAt: string }[];
  /** Providers, ₹: paid by customers, and still to send on */
  earned: number;
  owed: number;
}

export interface AdminJobRow {
  id: string;
  title: string;
  status: JobStatus;
  category: string | null;
  area: string | null;
  customer: string;
  pro: string | null;
  /** ₹: the hired quote, or the budget before hire */
  amount: number | null;
  progressPct: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminParty {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
}

export interface AdminJobDetail extends AdminJobRow {
  description: string | null;
  pincode: string | null;
  coordinates: Coordinates | null;
  budget: number | null;
  scheduledAt: string | null;
  isEmergency: boolean;
  startedAt: string | null;
  customerParty: AdminParty;
  proParty: AdminParty | null;
  quotes: { pro: string; amount: number; status: QuoteStatus; message: string | null; createdAt: string }[];
  stages: {
    stage: number;
    percent: number;
    status: MilestoneStatus;
    attempts: { note: string; reviewStatus: MilestoneStatus; reviewNote: string | null; submittedAt: string; photos: string[] }[];
  }[];
  events: { type: string; actor: string | null; data: Record<string, unknown>; at: string }[];
  payments: { id: string; status: PaymentStatus; amount: number; lastError: string | null; tries: number; paidAt: string | null; payoutStatus: PayoutStatus; payoutReference: string | null }[];
  reviews: AdminReviewItem[];
  canCancel: boolean;
}

export interface AdminPaymentRow {
  id: string;
  jobId: string;
  jobTitle: string;
  customer: string;
  pro: string;
  amount: number;
  status: PaymentStatus;
  method: string | null;
  lastError: string | null;
  tries: number;
  failedTries: number;
  payoutStatus: PayoutStatus;
  createdAt: string;
  paidAt: string | null;
}

export interface AdminPayout {
  paymentId: string;
  jobTitle: string;
  providerName: string | null;
  providerEmail: string;
  providerPhone: string | null;
  amount: number;
  paidAt: string | null;
  payoutStatus: PayoutStatus;
  payoutReference: string | null;
  payoutAt: string | null;
}

export interface AdminReviewRow extends AdminReviewItem {
  jobId: string;
  authorRole: UserRole;
  /** Who it's about */
  subject: string;
  hiddenReason: string | null;
}

export interface AdminCategory {
  id: string;
  name: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
  jobs: number;
  skills: { id: string; name: string; sortOrder: number; isActive: boolean; providers: number }[];
}

/** One admin action or console log-in */
export interface AuditEntry {
  id: string;
  /** e.g. "admin.approve" */
  action: string;
  summary: string;
  /** The admin's name, or the email typed for a failed log-in */
  actor: string | null;
  targetType: string | null;
  targetId: string | null;
  details: Record<string, unknown>;
  ip: string | null;
  createdAt: string;
}

/* Layout props shared by several admin screens */

// ----- Admins (the owner only) -----

/** Rejecting needs a reason; deactivating can have one */
export interface ReasonDialogProps {
  title: string;
  okText: string;
  required: boolean;
  reason: string;
  onReasonChange: (value: string) => void;
  sending: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// ----- System status -----

export interface HealthRow {
  name: string;
  label: string;
  badge: { label: string; tone: BadgeTone };
  message: string;
  /** e.g. "212 ms · checked 4:05 PM" */
  meta: string;
}

// ----- Lists with server-side pages -----

export interface PagedList<T> {
  rows: T[];
  page: number;
  pageSize: number;
  total: number;
  fetching: boolean;
  onPageChange: (page: number) => void;
}

/** A side panel opened from a row: its own request, and a close button */
export type DrawerProps<T> = (WithStatus<T> & { onClose: () => void }) | null;