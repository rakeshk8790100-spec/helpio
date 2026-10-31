import type { SelfServiceRole } from '../../../common/CommonEnum';

/* Request payloads of the /auth endpoints (backend wire format). Sign-in endpoints answer with a session. */

export interface RegisterDto {
  name: string;
  email: string;
  /** 10-digit Indian mobile number, without +91 */
  phone: string;
  /** 8–128 characters */
  password: string;
  role: SelfServiceRole;
}

/** Sign-up step 2: the code emailed by /auth/register */
export interface VerifySignupDto {
  email: string;
  otp: string;
}

/** /auth/register's answer: a code went to `email` (nothing is created until it is entered) */
export interface SignupCodeSent {
  email: string;
  /** Seconds before another code can be requested */
  resendIn: number;
  expiresInMinutes: number;
}

export interface LoginDto {
  email: string;
  password: string;
  /** The login page it came from; the backend refuses the other audience's accounts */
  role: SelfServiceRole;
}

export interface GoogleLoginDto {
  /** Google's ID token; the backend verifies it */
  id_token: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  email: string;
  /** The 6-digit code from the email */
  otp: string;
  new_password: string;
}
