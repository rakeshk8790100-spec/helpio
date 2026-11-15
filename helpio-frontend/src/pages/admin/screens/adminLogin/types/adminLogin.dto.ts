import type { FormInstance } from 'antd';
import type { EmailCodeStepProps } from '@/pages/auth/types/auth.dto';

/* The adminLogin admin screen: its layout's props. */

export interface AdminLoginFormValues {
  email: string;
  password: string;
}

export interface AdminLoginLayoutProps {
  form: FormInstance<AdminLoginFormValues>;
  sending: boolean;
  error?: string;
  onSubmit: (values: AdminLoginFormValues) => void;
  /** After the password: the code emailed to the admin */
  code: EmailCodeStepProps | null;
  onRequestAccess: () => void;
}
