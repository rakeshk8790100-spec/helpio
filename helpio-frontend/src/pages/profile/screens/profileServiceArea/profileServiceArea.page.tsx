import { ServiceAreaLayout } from '@/clients';
import SuspenseWrapper from '@/components/wrapper/SuspenseWrapper';
import { useServiceSetup } from '@/hooks/useServiceSetup';

/** /profile/service-area: the sign-up area and hours screen, saving back to Profile. */
const ProfileServiceAreaPage = () => (
  <SuspenseWrapper>
    <ServiceAreaLayout {...useServiceSetup({ editing: true })} />
  </SuspenseWrapper>
);

export default ProfileServiceAreaPage;
