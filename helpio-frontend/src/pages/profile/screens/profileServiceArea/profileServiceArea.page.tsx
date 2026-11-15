import ServiceAreaLayout from '../../../client/default/onboarding/serviceArea.layout';
import { useServiceSetup } from '../../../hooks/useServiceSetup';

/** /profile/service-area: the sign-up area and hours screen, saving back to Profile. */
const ProfileServiceAreaPage = () => <ServiceAreaLayout {...useServiceSetup({ editing: true })} />;

export default ProfileServiceAreaPage;
