import { Navigate, useSearchParams } from 'react-router-dom';
import CompleteProfileLayout from '../../../../client/default/auth/completeProfile.layout';
import LoginLayout from '../../../../client/default/auth/login.layout';
import type { AuthUser } from '../../../../common/CommonDto';
import { useAppSelector } from '../../../../redux';
import { selectCurrentUser } from '../../../../redux/authSlice';
import { homePath, needsProfile, safeNext } from '../../authRedirect';
import { useCompleteProfile } from '../../../../hooks/useCompleteProfile';
import { useLogin } from '../../../../hooks/useLogin';

const SignIn = () => <LoginLayout {...useLogin()} />;
const CompleteProfile = ({ user }: { user: AuthUser }) => <CompleteProfileLayout {...useCompleteProfile(user)} />;

/** /login: sign in, finish a missing profile, then continue to `next` or the user's starting point. */
const LoginPage = () => {
  const user = useAppSelector(selectCurrentUser);
  const [params] = useSearchParams();

  if (!user) return <SignIn />;
  if (needsProfile(user)) return <CompleteProfile user={user} />;
  return <Navigate to={safeNext(params.get('next')) ?? homePath(user)} replace />;
};

export default LoginPage;
