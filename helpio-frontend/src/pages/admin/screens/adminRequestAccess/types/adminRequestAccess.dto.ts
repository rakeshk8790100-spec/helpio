import type { FormInstance } from 'antd';
import type { EmailCodeStepProps } from '@/pages/auth/types/auth.dto';

/* The adminRequestAccess admin screen: its layout's props. */

export interface AccessRequestFormValues {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface AdminRequestAccessLayoutProps {
  form: FormInstance<AccessRequestFormValues>;
  sending: boolean;
  error?: string;
  onSubmit: (values: AccessRequestFormValues) => void;
  code: EmailCodeStepProps | null;
  /** Sent: waiting for the owner, or (the owner's own address) ready to log in */
  result: { email: string; approved: boolean } | null;
  onLogin: () => void;
}
