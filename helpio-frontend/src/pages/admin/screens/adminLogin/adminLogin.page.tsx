import { Navigate, useSearchParams } from 'react-router-dom';
import AdminLoginLayout from '../../../../client/default/admin/adminLogin.layout';
import { UserRole } from '../../../../common/CommonEnum';
import { RouterKeys } from '../../../../config/router/RouterKeys';
import { useAdminLogin } from '../../../../hooks/admin/useAdminLogin';
import { useAppSelector } from '../../../../redux';
import { selectCurrentUser } from '../../../../redux/authSlice';
import { safeNext } from '../../../auth/authRedirect';

/** /admin/login; an admin already signed in goes straight to the console. */
const AdminLoginPage = () => {
  const user = useAppSelector(selectCurrentUser);
  const [params] = useSearchParams();
  const props = useAdminLogin();
  if (user?.role === UserRole.ADMIN) return <Navigate to={safeNext(params.get('next')) ?? RouterKeys.ADMIN} replace />;
  return <AdminLoginLayout {...props} />;
};

export default AdminLoginPage;
