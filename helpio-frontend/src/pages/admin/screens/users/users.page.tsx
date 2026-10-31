import UsersLayout from '../../../../client/default/admin/users.layout';
import { useAdminUsers } from '../../../../hooks/admin/useAdminUsers';

/** /admin/users */
const UsersPage = () => <UsersLayout {...useAdminUsers()} />;

export default UsersPage;
