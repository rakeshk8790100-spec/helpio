
/** Forgot password: email the code, then set a new password */
export const ResetStep = {
  EMAIL: 'email',
  CODE: 'code',
} as const;
export type ResetStep = (typeof ResetStep)[keyof typeof ResetStep];
