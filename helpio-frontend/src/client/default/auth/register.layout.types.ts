import type { FormInstance } from 'antd';
import type { EmailCodeStepProps } from './emailCodeStep.types';
import type { DetailsFormValues } from './login.layout.types';

/* Contract between pages/auth/screens/register (behaviour) and client/default/auth/register.layout (markup). */

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
