import SystemStatusLayout from '../../../../client/default/admin/systemStatus.layout';
import { useSystemStatus } from '../../../../hooks/admin/useSystemStatus';

/** /admin/status */
const SystemStatusPage = () => <SystemStatusLayout {...useSystemStatus()} />;

export default SystemStatusPage;
