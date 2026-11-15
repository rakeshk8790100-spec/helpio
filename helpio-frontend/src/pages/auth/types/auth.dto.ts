import type { FormInstance } from 'antd';
import type { ComponentProps } from 'react';
import type { SelfServiceRole } from '@/common/CommonEnum';
import type { GoogleButton } from '@/components/ui';
import type { ResetStep } from './auth.enum';

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

/** "Continue with Google" (customers only). `configured: false` is a development-only reminder. */
export type GoogleOption =
  | ({ configured: true; loading: boolean } & ComponentProps<typeof GoogleButton>)
  | { configured: false };

export interface LoginFormValues {
  email: string;
  password: string;
}

/** Name and 10-digit mobile number (without +91) */
export interface DetailsFormValues {
  name: string;
  phone: string;
}

/** /login (customers) and /pro/login (providers) */
export interface LoginLayoutProps {
  audience: SelfServiceRole;
  /** Sent here by a page that needs an account */
  continuing: boolean;
  form: FormInstance<LoginFormValues>;
  initialValues: Partial<LoginFormValues>;
  onSubmit: (values: LoginFormValues) => void;
  submitting: boolean;
  error?: string;
  /** Customers only; null hides it */
  google: GoogleOption | null;
  onForgotPassword: () => void;
  onSignup: () => void;
  /** The other audience's log-in page */
  onSwitchAudience: () => void;
}

/** Signed in, but a customer still needs a name or mobile number (e.g. after Google sign-in) */
export interface CompleteProfileLayoutProps {
  email: string;
  form: FormInstance<DetailsFormValues>;
  initialValues: Partial<DetailsFormValues>;
  onSubmit: (values: DetailsFormValues) => void;
  submitting: boolean;
  error?: string;
  onLogout: () => void;
}

/** Customer sign-up */
export interface SignupFormValues extends DetailsFormValues {
  email: string;
  password: string;
}

export interface SignupLayoutProps {
  form: FormInstance<SignupFormValues>;
  onSubmit: (values: SignupFormValues) => void;
  submitting: boolean;
  error?: string;
  /** Set once the code is emailed: shown in place of the form */
  code: EmailCodeStepProps | null;
  /** The account waits for an admin's approval: shown in place of everything else */
  pending: { email: string; onHome: () => void } | null;
  /** null hides it */
  google: GoogleOption | null;
  onLogin: () => void;
  /** Provider sign-up */
  onSwitchAudience: () => void;
}

/** Provider sign-up step 1 */
export interface RegisterFormValues extends DetailsFormValues {
  email: string;
  password: string;
  agree: boolean;
}

export interface RegisterLayoutProps {
  form: FormInstance<RegisterFormValues>;
  initialValues: Partial<RegisterFormValues>;
  onSubmit: (values: RegisterFormValues) => void;
  submitting: boolean;
  error?: string;
  /** Set once the code is emailed: shown in place of the form */
  code: EmailCodeStepProps | null;
  onLogin: () => void;
  /** Customer sign-up */
  onSwitchAudience: () => void;
}

export interface LoginModalLayoutProps {
  /** null while the visitor is still choosing between customer and professional */
  role: SelfServiceRole | null;
  onChoose: (role: SelfServiceRole) => void;
  onBack: () => void;
  onClose: () => void;
  /** Goes to that audience's separate sign-up page */
  onSignup: (role: SelfServiceRole) => void;
  /** Props for the log-in form of the chosen role */
  login: LoginLayoutProps;
}

/** Ask for the email, then for the emailed code and a new password */

export interface ResetEmailFormValues {
  email: string;
}

export interface ResetFormValues {
  otp: string;
  password: string;
}

/** /forgot-password (customers) and /pro/forgot-password (providers) */
export interface ForgotPasswordLayoutProps {
  audience: SelfServiceRole;
  step: ResetStep;
  /** Where the code was sent, once known */
  email: string;
  error?: string;
  emailForm: {
    form: FormInstance<ResetEmailFormValues>;
    initialValues: Partial<ResetEmailFormValues>;
    onSubmit: (values: ResetEmailFormValues) => void;
    submitting: boolean;
  };
  resetForm: {
    form: FormInstance<ResetFormValues>;
    onSubmit: (values: ResetFormValues) => void;
    submitting: boolean;
  };
  /** Seconds until another code can be sent; 0 when allowed */
  resendIn: number;
  resending: boolean;
  onResend: () => void;
  onChangeEmail: () => void;
  onBackToLogin: () => void;
}

/* Sign-up's second step, shared by the customer and provider sign-up layouts. */

export interface EmailCodeFormValues {
  otp: string;
}

/** The account is created once the code emailed to `email` is entered */
export interface EmailCodeStepProps {
  email: string;
  form: FormInstance<EmailCodeFormValues>;
  onSubmit: (values: EmailCodeFormValues) => void;
  submitting: boolean;
  /** Seconds until another code can be sent; 0 when allowed */
  resendIn: number;
  resending: boolean;
  onResend: () => void;
  /** Back to the details form, still filled in */
  onChangeEmail: () => void;
}
