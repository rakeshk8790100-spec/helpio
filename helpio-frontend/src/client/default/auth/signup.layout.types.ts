import type { FormInstance } from 'antd';
import type { EmailCodeStepProps } from './emailCodeStep.types';
import type { DetailsFormValues, GoogleOption } from './login.layout.types';

/* Contract between pages/auth/screens/signup (behaviour) and client/default/auth/signup.layout (markup). */

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
