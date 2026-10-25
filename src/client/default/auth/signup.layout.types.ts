import type { FormInstance } from 'antd';
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
  /** null hides it */
  google: GoogleOption | null;
  onLogin: () => void;
  /** Provider sign-up */
  onSwitchAudience: () => void;
}
