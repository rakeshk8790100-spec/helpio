import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Form } from 'antd';
import type { RegisterFormValues, RegisterLayoutProps } from '../client/default/auth/register.layout.types';
import { UserRole } from '../common/CommonEnum';
import { RouterKeys } from '../config/router/RouterKeys';
import { apiErrorMessage } from '../lib/apiError';
import { useRegisterMutation } from '../pages/auth/auth.api';

/** /pro/signup?email=&skill= behaviour: provider details + password. RegisterPage then opens the skills step. */
export const useRegister = (): RegisterLayoutProps => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form] = Form.useForm<RegisterFormValues>();
  const [register, { isLoading }] = useRegisterMutation();
  const [error, setError] = useState<string>();

  return {
    form,
    initialValues: { email: params.get('email') ?? undefined },
    submitting: isLoading,
    error,
    onSubmit: async ({ name, email, phone, password }) => {
      setError(undefined);
      try {
        await register({ name: name.trim(), email, phone, password, role: UserRole.PROVIDER }).unwrap();
      } catch (e) {
        setError(apiErrorMessage(e));
      }
    },
    onLogin: () => navigate(RouterKeys.PRO_LOGIN),
    onSwitchAudience: () => navigate(RouterKeys.SIGNUP),
  };
};
