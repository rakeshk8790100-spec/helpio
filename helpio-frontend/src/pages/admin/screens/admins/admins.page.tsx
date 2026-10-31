import { Navigate } from 'react-router-dom';
import AdminsLayout from '../../../../client/default/admin/admins.layout';
import { RouterKeys } from '../../../../config/router/RouterKeys';
import { useAdmins } from '../../../../hooks/admin/useAdmins';
import { useAppSelector } from '../../../../redux';
import { selectCurrentUser } from '../../../../redux/authSlice';

const Admins = () => <AdminsLayout {...useAdmins()} />;

/** /admin/admins: the owner only (the API refuses everyone else too). */
const AdminsPage = () => {
  const user = useAppSelector(selectCurrentUser);
  return user?.isOwner ? <Admins /> : <Navigate to={RouterKeys.ADMIN} replace />;
};

export default AdminsPage;
