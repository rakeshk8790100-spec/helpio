import { Navigate, useSearchParams } from 'react-router-dom';
import SignupLayout from '../../../../client/default/auth/signup.layout';
import { RouterKeys, withQuery } from '../../../../config/router/RouterKeys';
import { useAppSelector } from '../../../../redux';
import { selectCurrentUser } from '../../../../redux/authSlice';
import { homePath, needsProfile, safeNext } from '../../authRedirect';
import { useSignup } from '../../../../hooks/useSignup';

const SignUp = () => <SignupLayout {...useSignup()} />;

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
