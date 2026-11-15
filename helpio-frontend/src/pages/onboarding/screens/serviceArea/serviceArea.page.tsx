import { ServiceAreaLayout } from '@/clients';
import SuspenseWrapper from '@/components/wrapper/SuspenseWrapper';
import { useServiceSetup } from '@/hooks/useServiceSetup';

/** Provider sign-up step 3: service area and hours. */
const ServiceAreaPage = () => (
  <SuspenseWrapper>
    <ServiceAreaLayout {...useServiceSetup()} />
  </SuspenseWrapper>
);

export default ServiceAreaPage;
