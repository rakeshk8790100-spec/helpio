import type { ComponentProps } from 'react';
import type { FormInstance } from 'antd';
import type { OtpVerify } from '../../../component/marketplace';
import type { GoogleButton } from '../../../component/ui';

/* Contract between pages/auth/screens/login (behaviour) and client/default/auth (markup). */

/** Tabs on the /login page, also accepted as `?tab=` */
export const LoginTab = {
  CUSTOMER: 'customer',
  PROVIDER: 'provider',
} as const;
export type LoginTab = (typeof LoginTab)[keyof typeof LoginTab];

/** Form shown before the code step: email, new-customer details, or "no professional account" */
export const LoginStep = {
  EMAIL: 'email',
  DETAILS: 'details',
  NOT_FOUND: 'notFound',
} as const;
export type LoginStep = (typeof LoginStep)[keyof typeof LoginStep];

export interface EmailFormValues {
  email: string;
}

/** Name and 10-digit mobile number (without +91) */
export interface DetailsFormValues {
  name: string;
  phone: string;
}

export interface LoginLayoutProps {
  tab: LoginTab;
  onTabChange: (tab: LoginTab) => void;
  step: LoginStep;
  /** The email being signed in, once entered */
  email: string;
  onChangeEmail: () => void;
  error?: string;

  /** Customers only; null when Google sign-in isn't configured */
  google: (ComponentProps<typeof GoogleButton> & { loading: boolean }) | null;

  emailForm: {
    form: FormInstance<EmailFormValues>;
    onSubmit: (values: EmailFormValues) => void;
    submitting: boolean;
  };
  /** New customer: name and mobile, then a sign-up code */
  detailsForm: {
    form: FormInstance<DetailsFormValues>;
    onSubmit: (values: DetailsFormValues) => void;
    submitting: boolean;
  };
  onJoinProvider: () => void;

  /** Code step; replaces the forms while set */
  otp: ComponentProps<typeof OtpVerify> | null;
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
