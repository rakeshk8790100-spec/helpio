import AdminRequestAccessLayout from '../../../../client/default/admin/adminRequestAccess.layout';
import { useAdminRequestAccess } from '../../../../hooks/admin/useAdminRequestAccess';

/** /admin/request-access */
const AdminRequestAccessPage = () => <AdminRequestAccessLayout {...useAdminRequestAccess()} />;

export default AdminRequestAccessPage;
