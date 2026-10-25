import { Navigate } from 'react-router-dom';
import CustomerHomeLayout from '../../client/default/home/customerHome.layout';
import ProviderHomeLayout from '../../client/default/home/providerHome.layout';
import type { AuthUser } from '../../common/CommonDto';
import { UserRole } from '../../common/CommonEnum';
import { RouterKeys } from '../../config/router/RouterKeys';
import { useCustomerHome } from '../../hooks/useCustomerHome';
import { useProviderHome } from '../../hooks/useProviderHome';
import { useAppSelector } from '../../redux';
import { selectCurrentUser } from '../../redux/authSlice';
import { signUpRedirect } from '../auth/authRedirect';
import HeroPage from '../hero/hero.page';

const CustomerHome = ({ user }: { user: AuthUser }) => <CustomerHomeLayout {...useCustomerHome(user)} />;
const ProviderHome = ({ user }: { user: AuthUser }) => <ProviderHomeLayout {...useProviderHome(user)} />;

/** `/`: the public landing page when signed out, otherwise the customer or provider home. */
const HomePage = () => {
  const user = useAppSelector(selectCurrentUser);

  if (!user || user.role === UserRole.ADMIN) return <HeroPage />;
  // Unfinished sign-up (customer profile, provider onboarding) comes first
  const redirect = signUpRedirect(user, RouterKeys.HOME);
  if (redirect) return <Navigate to={redirect} replace />;
  return user.role === UserRole.PROVIDER ? <ProviderHome user={user} /> : <CustomerHome user={user} />;
};

export default HomePage;
