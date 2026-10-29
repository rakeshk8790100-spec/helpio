import PaymentsLayout from '../../../../client/default/admin/payments.layout';
import { useAdminPayments } from '../../../../hooks/admin/useAdminPayments';

/** /admin/payments */
const PaymentsPage = () => <PaymentsLayout {...useAdminPayments()} />;

export default PaymentsPage;
