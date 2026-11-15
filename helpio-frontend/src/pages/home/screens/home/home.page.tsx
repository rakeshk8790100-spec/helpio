import { Navigate } from 'react-router-dom';
import { UserRole } from '@/common/CommonEnum';
import SuspenseWrapper from '@/components/wrapper/SuspenseWrapper';
import { RouterKeys } from '@/config/router/RouterKeys';
import { signUpRedirect } from '@/pages/auth/authRedirect';
import { HeroPage } from '@/pages/hero';
import { CustomerHomePage, ProviderHomePage } from '@/pages/home';
import { useAppSelector } from '@/redux';
import { selectCurrentUser } from '@/redux/authSlice';

/** `/`: the public landing page when signed out, otherwise the customer or provider home (admins: the console). */
const HomePage = () => {
  const user = useAppSelector(selectCurrentUser);

  if (user?.role === UserRole.ADMIN) return <Navigate to={RouterKeys.ADMIN} replace />;
  // Unfinished sign-up (customer profile, provider onboarding) comes first
  const redirect = user && signUpRedirect(user, RouterKeys.HOME);
  if (redirect) return <Navigate to={redirect} replace />;
  return (
    <SuspenseWrapper>
      {!user ? <HeroPage /> : user.role === UserRole.PROVIDER ? <ProviderHomePage user={user} /> : <CustomerHomePage user={user} />}
    </SuspenseWrapper>
  );
};

export default HomePage;
