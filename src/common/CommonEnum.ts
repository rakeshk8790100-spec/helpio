// `erasableSyntaxOnly` disallows TS enums, so we use const objects + derived unions.

export const UserRole = {
  ADMIN: 'admin',
  CUSTOMER: 'customer',
  PROVIDER: 'provider',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

/** Roles that sign themselves up; each has its own log-in and sign-up pages. */
export type SelfServiceRole = typeof UserRole.CUSTOMER | typeof UserRole.PROVIDER;

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

/** A custom job, from draft to paid-out. Escrow, PIN and milestones move it past `accepted`. */
export const JobStatus = {
  DRAFT: 'draft',
  OPEN: 'open',
  ACCEPTED: 'accepted',
  FUNDED: 'funded',
  IN_PROGRESS: 'in_progress',
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
