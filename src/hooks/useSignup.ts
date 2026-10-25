import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Form } from 'antd';
import type { SignupFormValues, SignupLayoutProps } from '../client/default/auth/signup.layout.types';
import { UserRole } from '../common/CommonEnum';
import { RouterKeys, withQuery } from '../config/router/RouterKeys';
import { apiErrorMessage } from '../lib/apiError';
import { useRegisterMutation } from '../pages/auth/auth.api';
import { safeNext } from '../pages/auth/authRedirect';
import { useGoogleSignIn } from './useGoogleSignIn';

/** /signup behaviour: customer details + password (keeps `?next=`). SignupPage redirects once signed in. */
export const useSignup = (): SignupLayoutProps => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [form] = Form.useForm<SignupFormValues>();
  const [register, { isLoading }] = useRegisterMutation();
  const [error, setError] = useState<string>();
  const google = useGoogleSignIn(setError);

  return {
    form,
    submitting: isLoading,
    error,
    onSubmit: async ({ name, email, phone, password }) => {
      setError(undefined);
      try {
        await register({ name: name.trim(), email, phone, password, role: UserRole.CUSTOMER }).unwrap();
      } catch (e) {
        setError(apiErrorMessage(e));
      }
    },
    google,
    onLogin: () => navigate(next ? withQuery(RouterKeys.LOGIN, { next }) : RouterKeys.LOGIN),
    onSwitchAudience: () => navigate(RouterKeys.PRO_SIGNUP),
  };
};
