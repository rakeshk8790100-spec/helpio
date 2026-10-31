import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { UserRole } from '../../common/CommonEnum';
import { RouterKeys, withQuery } from '../../config/router/RouterKeys';
import { useAppSelector } from '../../redux';
import { selectCurrentUser } from '../../redux/authSlice';
import { loginPathFor, signUpRedirect } from './authRedirect';

/**
 * Layout route for signed-in screens: asks for login (customer or provider page, by `roles`), finishes
 * any pending sign-up step first, then checks the role. Real authorization happens on the backend.
 */
const RequireAuth = ({ roles }: { roles?: UserRole[] }) => {
  const user = useAppSelector(selectCurrentUser);
  const { pathname, search } = useLocation();

  if (!user) return <Navigate to={withQuery(loginPathFor(roles), { next: pathname + search })} replace />;
  const redirect = signUpRedirect(user, pathname);
  if (redirect) return <Navigate to={redirect} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={RouterKeys.HOME} replace />;
  return <Outlet />;
};

export default RequireAuth;
