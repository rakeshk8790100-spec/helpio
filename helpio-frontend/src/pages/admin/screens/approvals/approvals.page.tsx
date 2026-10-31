import ApprovalsLayout from '../../../../client/default/admin/approvals.layout';
import { useApprovals } from '../../../../hooks/admin/useApprovals';

/** /admin/approvals */
const ApprovalsPage = () => <ApprovalsLayout {...useApprovals()} />;

export default ApprovalsPage;
