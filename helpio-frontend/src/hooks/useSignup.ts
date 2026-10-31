import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Form } from 'antd';
import type { SignupFormValues, SignupLayoutProps } from '../client/default/auth/signup.layout.types';
import { UserRole } from '../common/CommonEnum';
import { RouterKeys, withQuery } from '../config/router/RouterKeys';
import { safeNext } from '../pages/auth/authRedirect';
import { useGoogleSignIn } from './useGoogleSignIn';
import { useSignupCode } from './useSignupCode';

/**
 * /signup behaviour: customer details + password, then the emailed code (keeps `?next=`).
 * SignupPage redirects once the code signs the user in.
 */
export const useSignup = (): SignupLayoutProps => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [form] = Form.useForm<SignupFormValues>();
  const signup = useSignupCode(UserRole.CUSTOMER);
  const [googleError, setGoogleError] = useState<string>();
  const google = useGoogleSignIn(setGoogleError);

  return {
    form,
    submitting: signup.sending,
    error: signup.error ?? googleError,
    onSubmit: ({ name, email, phone, password }) => {
      setGoogleError(undefined);
      void signup.send({ name: name.trim(), email, phone, password });
    },
    code: signup.step,
    pending: signup.pending ? { email: signup.pending, onHome: () => navigate(RouterKeys.HOME) } : null,
    google,
    onLogin: () => navigate(next ? withQuery(RouterKeys.LOGIN, { next }) : RouterKeys.LOGIN),
    onSwitchAudience: () => navigate(RouterKeys.PRO_SIGNUP),
  };
};
