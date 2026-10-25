import { useParams } from 'react-router-dom';
import ProviderProfileLayout from '../../../client/default/pros/providerProfile.layout';
import type { AuthUser } from '../../../common/CommonDto';
import { PageSkeleton } from '../../../component/ui';
import { useProviderProfile } from '../../../hooks/useProviderProfile';
import { useAppSelector } from '../../../redux';
import { selectCurrentUser } from '../../../redux/authSlice';

const ProviderProfile = ({ id, user }: { id: string; user: AuthUser }) => <ProviderProfileLayout {...useProviderProfile(id, user)} />;

/** /pros/:id: a pro's public profile. Keyed by id so the request sheet starts fresh per pro. */
const ProviderProfilePage = () => {
  const { id = '' } = useParams();
  const user = useAppSelector(selectCurrentUser);
  return user ? <ProviderProfile key={id} id={id} user={user} /> : <PageSkeleton />;
};

export default ProviderProfilePage;
