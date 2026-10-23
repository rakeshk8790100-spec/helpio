import ServiceAreaLayout from '../../../../client/default/onboarding/serviceArea.layout';
import { useServiceSetup } from '../../../../hooks/useServiceSetup';

/** Provider sign-up step 3. Markup lives in client/default/onboarding. */
const ServiceAreaPage = () => <ServiceAreaLayout {...useServiceSetup()} />;

export default ServiceAreaPage;
