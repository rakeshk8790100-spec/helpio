import { Navigate, useSearchParams } from 'react-router-dom';
import LoginLayout from '../../../../client/default/auth/login.layout';
import { UserRole } from '../../../../common/CommonEnum';
import { useAppSelector } from '../../../../redux';
import { selectCurrentUser } from '../../../../redux/authSlice';
import { homePath, safeNext } from '../../authRedirect';
import { useLogin } from '../../../../hooks/useLogin';

const SignIn = () => <LoginLayout {...useLogin(UserRole.PROVIDER)} />;

/** /pro/login: provider log-in. Once signed in, continue to `next` or resume unfinished sign-up. */
const ProLoginPage = () => {
  const user = useAppSelector(selectCurrentUser);
  const [params] = useSearchParams();

  if (!user) return <SignIn />;
  return <Navigate to={safeNext(params.get('next')) ?? homePath(user)} replace />;
};

export default ProLoginPage;
