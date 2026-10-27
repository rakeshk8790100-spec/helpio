import type { FormInstance } from 'antd';

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
