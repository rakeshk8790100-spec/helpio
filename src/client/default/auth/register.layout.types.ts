import type { ComponentProps } from 'react';
import type { FormInstance } from 'antd';
import type { OtpVerify } from '../../../component/marketplace';
import type { DetailsFormValues } from './login.layout.types';

/* Contract between pages/auth/screens/register (behaviour) and client/default/auth/register.layout (markup). */

/** Provider sign-up step 1 */
export interface RegisterFormValues extends DetailsFormValues {
  email: string;
  agree: boolean;
}

export interface RegisterLayoutProps {
  form: FormInstance<RegisterFormValues>;
  initialValues: Partial<RegisterFormValues>;
  onSubmit: (values: RegisterFormValues) => void;
  submitting: boolean;
  error?: string;
  onLogin: () => void;
  /** Code step; replaces the form while set */
  otp: ComponentProps<typeof OtpVerify> | null;
}
