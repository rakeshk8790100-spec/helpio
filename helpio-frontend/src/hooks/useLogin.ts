import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Form } from 'antd';
import type { LoginFormValues, LoginLayoutProps } from '../client/default/auth/login.layout.types';
import { UserRole } from '../common/CommonEnum';
import type { SelfServiceRole } from '../common/CommonEnum';
import { RouterKeys, withQuery } from '../config/router/RouterKeys';
import { apiErrorMessage } from '../lib/apiError';
import { useLoginMutation } from '../pages/auth/auth.api';
import { safeNext } from '../pages/auth/authRedirect';
import { useGoogleSignIn } from './useGoogleSignIn';

const PAGES = {
  [UserRole.CUSTOMER]: { signup: RouterKeys.SIGNUP, forgot: RouterKeys.FORGOT_PASSWORD, other: RouterKeys.PRO_LOGIN },
  [UserRole.PROVIDER]: { signup: RouterKeys.PRO_SIGNUP, forgot: RouterKeys.PRO_FORGOT_PASSWORD, other: RouterKeys.LOGIN },
};

interface LoginOptions {
  /** Runs before leaving for another page (the log-in popup closes itself) */
  onNavigate?: () => void;
  /** Replaces the jump to the other audience's log-in page (the popup switches in place) */
  onSwitchAudience?: () => void;
}

/** /login and /pro/login behaviour (reads `?next=` and `?email=`). The page redirects once signed in. */
export const useLogin = (audience: SelfServiceRole, { onNavigate, onSwitchAudience }: LoginOptions = {}): LoginLayoutProps => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [form] = Form.useForm<LoginFormValues>();
  const [login, { isLoading }] = useLoginMutation();
  const [error, setError] = useState<string>();
  const google = useGoogleSignIn(setError);
  const pages = PAGES[audience];

  return {
    audience,
    continuing: next !== null,
    form,
    initialValues: { email: params.get('email') ?? undefined },
    submitting: isLoading,
    error,
    onSubmit: async ({ email, password }) => {
      setError(undefined);
      try {
        await login({ email, password, role: audience }).unwrap();
      } catch (e) {
        setError(apiErrorMessage(e));
      }
    },
    google: audience === UserRole.CUSTOMER ? google : null,
    onForgotPassword: () => {
      const email = form.getFieldValue('email');
      onNavigate?.();
      navigate(typeof email === 'string' && email.trim() ? withQuery(pages.forgot, { email: email.trim() }) : pages.forgot);
    },
    // Customers come back to what they were opening; providers always continue into onboarding
    onSignup: () => {
      onNavigate?.();
      navigate(next && audience === UserRole.CUSTOMER ? withQuery(pages.signup, { next }) : pages.signup);
    },
    onSwitchAudience: onSwitchAudience ?? (() => navigate(pages.other)),
  };
};
