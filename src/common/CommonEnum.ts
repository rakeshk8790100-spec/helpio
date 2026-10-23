// `erasableSyntaxOnly` disallows TS enums, so we use const objects + derived unions.

export const UserRole = {
  ADMIN: 'admin',
  CUSTOMER: 'customer',
  PROVIDER: 'provider',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

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

/** Why an email code was sent: creating an account, or signing in to an existing one. */
export const OtpPurpose = {
  SIGNUP: 'signup',
  LOGIN: 'login',
} as const;
export type OtpPurpose = (typeof OtpPurpose)[keyof typeof OtpPurpose];

/** Digits in an emailed sign-in code */
export const OTP_LENGTH = 6;
