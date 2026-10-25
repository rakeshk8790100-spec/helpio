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
