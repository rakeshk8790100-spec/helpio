import { App, Form } from 'antd';
import { useState } from 'react';
import { Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { AdminLoginLayout } from '@/clients';
import { UserRole } from '@/common/CommonEnum';
import SuspenseWrapper from '@/components/wrapper/SuspenseWrapper';
import { RouterKeys } from '@/config/router/RouterKeys';
import { useCountdown } from '@/hooks/useCountdown';
import { apiErrorMessage } from '@/lib/apiError';
import { safeNext } from '@/pages/auth/authRedirect';
import type { EmailCodeFormValues } from '@/pages/auth/types/auth.dto';
import { useAppSelector } from '@/redux';
import { selectCurrentUser } from '@/redux/authSlice';
import { useAdminLoginMutation, useAdminVerifyMutation } from './adminLogin.api';
import type { AdminLoginFormValues, AdminLoginLayoutProps } from './types/adminLogin.dto';

/** /admin/login: the password, then the code emailed to the admin; back to `?next=` or the console. */
const useAdminLogin = (): AdminLoginLayoutProps => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { message } = App.useApp();
  const [form] = Form.useForm<AdminLoginFormValues>();
  const [codeForm] = Form.useForm<EmailCodeFormValues>();
  // Kept to resend the code; held in memory only
  const [sent, setSent] = useState<AdminLoginFormValues | null>(null);
  const [error, setError] = useState<string>();
  const { secondsLeft, start } = useCountdown();
  const [login, { isLoading: sending }] = useAdminLoginMutation();
  const [verify, { isLoading: verifying }] = useAdminVerifyMutation();

  const send = async (values: AdminLoginFormValues) => {
    setError(undefined);
    try {
      const result = await login(values).unwrap();
      setSent({ ...values, email: result.email });
      start(result.resendIn);
      return true;
    } catch (e) {
      setError(apiErrorMessage(e));
      return false;
    }
  };

  return {
    form,
    sending,
    error,
    onSubmit: send,
    code: sent && {
      email: sent.email,
      form: codeForm,
      submitting: verifying,
      onSubmit: async ({ otp }) => {
        setError(undefined);
        try {
          await verify({ email: sent.email, otp }).unwrap();
          void navigate(safeNext(params.get('next')) ?? RouterKeys.ADMIN, { replace: true });
        } catch (e) {
          setError(apiErrorMessage(e));
          codeForm.setFieldValue('otp', '');
        }
      },
      resendIn: secondsLeft,
      resending: sending,
      onResend: async () => {
        if (await send(sent)) message.success('We sent a new code');
      },
      onChangeEmail: () => {
        setError(undefined);
        setSent(null);
      },
    },
    onRequestAccess: () => navigate(RouterKeys.ADMIN_REQUEST_ACCESS),
  };
};

/** /admin/login; an admin already signed in goes straight to the console. */
const AdminLoginPage = () => {
  const user = useAppSelector(selectCurrentUser);
  const [params] = useSearchParams();
  const props = useAdminLogin();
  if (user?.role === UserRole.ADMIN) return <Navigate to={safeNext(params.get('next')) ?? RouterKeys.ADMIN} replace />;
  return <SuspenseWrapper><AdminLoginLayout {...props} /></SuspenseWrapper>;
};

export default AdminLoginPage;
