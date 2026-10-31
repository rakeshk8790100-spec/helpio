import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { App, Form } from 'antd';
import type { AdminLoginFormValues, AdminLoginLayoutProps } from '../../client/default/admin/admin.layout.types';
import type { EmailCodeFormValues } from '../../client/default/auth/emailCodeStep.types';
import { RouterKeys } from '../../config/router/RouterKeys';
import { apiErrorMessage } from '../../lib/apiError';
import { useAdminLoginMutation, useAdminVerifyMutation } from '../../pages/admin/admin.api';
import { safeNext } from '../../pages/auth/authRedirect';
import { useCountdown } from '../useCountdown';

/** /admin/login: the password, then the code emailed to the admin; back to `?next=` or the console. */
export const useAdminLogin = (): AdminLoginLayoutProps => {
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
          navigate(safeNext(params.get('next')) ?? RouterKeys.ADMIN, { replace: true });
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
