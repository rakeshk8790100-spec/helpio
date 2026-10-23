import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Form } from 'antd';
import { LoginTab } from '../client/default/auth/login.layout.types';
import type { RegisterFormValues, RegisterLayoutProps } from '../client/default/auth/register.layout.types';
import { OtpPurpose } from '../common/CommonEnum';
import { RouterKeys, withQuery } from '../config/router/RouterKeys';
import { apiErrorMessage } from '../lib/apiError';
import { useRegisterMutation } from '../pages/auth/auth.api';
import { useOtpStep } from './useOtpStep';

/** /register?email=&skill= behaviour: provider details, then the email code. RegisterPage redirects after. */
export const useRegister = (): RegisterLayoutProps => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form] = Form.useForm<RegisterFormValues>();
  const [register, { isLoading }] = useRegisterMutation();
  const [error, setError] = useState<string>();
  const otp = useOtpStep();

  return {
    form,
    initialValues: { email: params.get('email') ?? undefined },
    submitting: isLoading,
    error,
    onSubmit: async ({ name, email, phone }) => {
      setError(undefined);
      try {
        await register({ name: name.trim(), email, phone, role: 'provider' }).unwrap();
        otp.open({ email, purpose: OtpPurpose.SIGNUP });
      } catch (e) {
        setError(apiErrorMessage(e));
      }
    },
    onLogin: () => navigate(withQuery(RouterKeys.LOGIN, { tab: LoginTab.PROVIDER })),
    otp: otp.props,
  };
};
