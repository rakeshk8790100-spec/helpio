import AuditLogLayout from '../../../../client/default/admin/auditLog.layout';
import { useAuditLog } from '../../../../hooks/admin/useAuditLog';

/** /admin/audit */
const AuditLogPage = () => <AuditLogLayout {...useAuditLog()} />;

export default AuditLogPage;
