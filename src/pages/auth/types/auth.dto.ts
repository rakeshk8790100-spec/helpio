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
