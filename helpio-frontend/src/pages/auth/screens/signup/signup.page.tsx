import { Form } from 'antd';
import { useState } from 'react';
import { Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { SignupLayout } from '@/clients';
import { UserRole } from '@/common/CommonEnum';
import SuspenseWrapper from '@/components/wrapper/SuspenseWrapper';
import { RouterKeys, withQuery } from '@/config/router/RouterKeys';
import { useGoogleSignIn } from '@/hooks/useGoogleSignIn';
import { useSignupCode } from '@/hooks/useSignupCode';
import { homePath, needsProfile, safeNext } from '@/pages/auth/authRedirect';
import type { SignupFormValues, SignupLayoutProps } from '@/pages/auth/types/auth.dto';
import { useAppSelector } from '@/redux';
import { selectCurrentUser } from '@/redux/authSlice';

/**
 * /signup behaviour: customer details + password, then the emailed code (keeps `?next=`).
 * SignupPage redirects once the code signs the user in.
 */
const useSignup = (): SignupLayoutProps => {
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

const SignUp = () => <SuspenseWrapper><SignupLayout {...useSignup()} /></SuspenseWrapper>;

/** /signup: customer sign-up, then continue to `next`. Google users missing a mobile number finish on /login. */
const SignupPage = () => {
  const user = useAppSelector(selectCurrentUser);
  const [params] = useSearchParams();

  if (!user) return <SignUp />;
  const next = safeNext(params.get('next'));
  if (needsProfile(user)) return <Navigate to={next ? withQuery(RouterKeys.LOGIN, { next }) : RouterKeys.LOGIN} replace />;
  return <Navigate to={next ?? homePath(user)} replace />;
};

export default SignupPage;
