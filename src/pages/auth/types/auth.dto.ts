import type { OtpPurpose } from '../../../common/CommonEnum';

/* Request/response payloads of the /auth endpoints (backend wire format). */

export type SelfServiceRole = 'customer' | 'provider';

export interface OtpStartDto {
  email: string;
  role: SelfServiceRole;
}

/** `otp`: a code was emailed. `details`: no account yet; collect name and phone. */
export interface NextStepDto {
  next: 'otp' | 'details';
}

export interface RegisterDto {
  name: string;
  email: string;
  /** 10-digit Indian mobile number, without +91 */
  phone: string;
  role: SelfServiceRole;
}

export interface VerifyOtpDto {
  email: string;
  otp: string;
  purpose: OtpPurpose;
}

export interface ResendOtpDto {
  email: string;
  purpose: OtpPurpose;
}

export interface GoogleLoginDto {
  /** Google's ID token; the backend verifies it */
  id_token: string;
}
