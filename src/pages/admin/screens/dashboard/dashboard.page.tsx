import DashboardLayout from '../../../../client/default/admin/dashboard.layout';
import { useAdminDashboard } from '../../../../hooks/admin/useAdminDashboard';

/** /admin */
const DashboardPage = () => <DashboardLayout {...useAdminDashboard()} />;

export default DashboardPage;
