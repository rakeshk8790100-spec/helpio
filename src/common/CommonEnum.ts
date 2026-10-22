// `erasableSyntaxOnly` disallows TS enums, so we use const objects + derived unions.

export const UserRole = {
  CUSTOMER: 'customer',
  PROVIDER: 'provider',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];
