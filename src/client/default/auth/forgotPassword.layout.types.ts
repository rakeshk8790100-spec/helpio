import type { FormInstance } from 'antd';
import type { SelfServiceRole } from '../../../common/CommonEnum';

/* Contract between pages/auth/screens/forgotPassword (behaviour) and client/default/auth (markup). */

/** Ask for the email, then for the emailed code and a new password */
export const ResetStep = {
  EMAIL: 'email',
  CODE: 'code',
} as const;
export type ResetStep = (typeof ResetStep)[keyof typeof ResetStep];

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
