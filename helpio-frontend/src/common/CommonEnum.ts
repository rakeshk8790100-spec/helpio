
// `erasableSyntaxOnly` disallows TS enums, so we use const objects + derived unions.

export const UserRole = {
  ADMIN: 'admin',
  CUSTOMER: 'customer',
  PROVIDER: 'provider',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

/** Roles that sign themselves up; each has its own log-in and sign-up pages. */
export type SelfServiceRole = typeof UserRole.CUSTOMER | typeof UserRole.PROVIDER;

/** New admins (and, when switched on, new customers and providers) wait for an admin's approval */
export const ApprovalStatus = {
  APPROVED: 'approved',
  PENDING: 'pending',
  REJECTED: 'rejected',
} as const;
export type ApprovalStatus = (typeof ApprovalStatus)[keyof typeof ApprovalStatus];

/** Provider sign-up progress: the next step to complete, or `complete`. */
export const OnboardingStatus = {
  SKILLS: 'skills',
  SERVICE_SETUP: 'service_setup',
  COMPLETE: 'complete',
} as const;
export type OnboardingStatus = (typeof OnboardingStatus)[keyof typeof OnboardingStatus];

export const Proficiency = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  EXPERT: 'expert',
} as const;
export type Proficiency = (typeof Proficiency)[keyof typeof Proficiency];

/** Digits in an emailed password-reset code */
export const OTP_LENGTH = 6;

/** A custom job, from draft to paid-out. PIN and milestones move it past `accepted`; paying completes it. */
export const JobStatus = {
  DRAFT: 'draft',
  OPEN: 'open',
  ACCEPTED: 'accepted',
  FUNDED: 'funded',
  IN_PROGRESS: 'in_progress',
  /** All four stages approved; the customer pays the hired quote on Razorpay */
  PAYMENT_DUE: 'payment_due',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  DISPUTED: 'disputed',
} as const;
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

export const QuoteStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
} as const;
export type QuoteStatus = (typeof QuoteStatus)[keyof typeof QuoteStatus];

/** A provider sign-up checklist step; `unavailable` steps (e.g. KYC) aren't offered yet. */
export const ChecklistState = {
  DONE: 'done',
  PENDING: 'pending',
  UNAVAILABLE: 'unavailable',
} as const;
export type ChecklistState = (typeof ChecklistState)[keyof typeof ChecklistState];

/** A customer's direct request to one pro: waiting, answered with a quote, or turned down */
export const InviteStatus = {
  PENDING: 'pending',
  QUOTED: 'quoted',
  DECLINED: 'declined',
} as const;
export type InviteStatus = (typeof InviteStatus)[keyof typeof InviteStatus];

export const AddressLabel = {
  HOME: 'home',
  WORK: 'work',
  OTHER: 'other',
} as const;
export type AddressLabel = (typeof AddressLabel)[keyof typeof AddressLabel];

/** One of a hired job's four 25% stages: the pro sends photos and a note, the customer approves or asks for changes */
export const MilestoneStatus = {
  PENDING: 'pending',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  CHANGES_REQUESTED: 'changes_requested',
} as const;
export type MilestoneStatus = (typeof MilestoneStatus)[keyof typeof MilestoneStatus];

/** Entries on a hired job's timeline, seen by the customer and the pro */
export const JobEventType = {
  HIRED: 'hired',
  STARTED: 'started',
  MILESTONE_SUBMITTED: 'milestone_submitted',
  MILESTONE_APPROVED: 'milestone_approved',
  CHANGES_REQUESTED: 'changes_requested',
  STAGE_OVERDUE: 'stage_overdue',
  PAYMENT_FAILED: 'payment_failed',
  PAID: 'paid',
  REVIEWED: 'reviewed',
  COMPLETED: 'completed',
} as const;
export type JobEventType = (typeof JobEventType)[keyof typeof JobEventType];

/** A Razorpay payment link: open (a failed try keeps it open), paid, or closed without a payment */
export const PaymentStatus = {
  PENDING: 'pending',
  PAID: 'paid',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

/** One try on Razorpay, in Razorpay's own words */
export const PaymentAttemptStatus = {
  CREATED: 'created',
  AUTHORIZED: 'authorized',
  CAPTURED: 'captured',
  REFUNDED: 'refunded',
  FAILED: 'failed',
} as const;
export type PaymentAttemptStatus = (typeof PaymentAttemptStatus)[keyof typeof PaymentAttemptStatus];

/** Helpio sends the pro their money by hand after the customer pays */
export const PayoutStatus = {
  PENDING: 'pending',
  PAID: 'paid',
} as const;
export type PayoutStatus = (typeof PayoutStatus)[keyof typeof PayoutStatus];
