import type { ComponentProps } from 'react';
import type { FormInstance } from 'antd';
import type { SelfServiceRole } from '../../../common/CommonEnum';
import type { GoogleButton } from '../../../component/ui';

/* Contract between the log-in pages (behaviour) and client/default/auth (markup). */

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
