import EarningsLayout from '../../client/default/earnings/earnings.layout';
import { useEarnings } from '../../hooks/useEarnings';

/** /pro/earnings: what customers paid and Helpio's payouts to the provider. */
const EarningsPage = () => <EarningsLayout {...useEarnings()} />;

export default EarningsPage;
