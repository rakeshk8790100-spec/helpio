import { Navigate, useSearchParams } from 'react-router-dom';
import { LoginLayout } from '@/clients';
import { UserRole } from '@/common/CommonEnum';
import SuspenseWrapper from '@/components/wrapper/SuspenseWrapper';
import { useLogin } from '@/hooks/useLogin';
import { homePath, safeNext } from '@/pages/auth/authRedirect';
import { useAppSelector } from '@/redux';
import { selectCurrentUser } from '@/redux/authSlice';

const SignIn = () => <SuspenseWrapper><LoginLayout {...useLogin(UserRole.PROVIDER)} /></SuspenseWrapper>;

/** /pro/login: provider log-in. Once signed in, continue to `next` or resume unfinished sign-up. */
const ProLoginPage = () => {
  const user = useAppSelector(selectCurrentUser);
  const [params] = useSearchParams();

  if (!user) return <SignIn />;
  return <Navigate to={safeNext(params.get('next')) ?? homePath(user)} replace />;
};

export default ProLoginPage;
