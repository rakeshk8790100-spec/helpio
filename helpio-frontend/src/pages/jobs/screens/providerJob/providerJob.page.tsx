import { Navigate, useParams } from 'react-router-dom';
import ProviderJobLayout from '../../../../client/default/jobs/providerJob.layout';
import type { AuthUser } from '../../../../common/CommonDto';
import { RouterKeys } from '../../../../config/router/RouterKeys';
import { useProviderJob } from '../../../../hooks/useProviderJob';
import { useAppSelector } from '../../../../redux';
import { selectCurrentUser } from '../../../../redux/authSlice';

const ProviderJob = ({ id, user }: { id: string; user: AuthUser }) => <ProviderJobLayout {...useProviderJob(id, user)} />;

/** /pro/jobs/:id: a nearby job (masked) and the provider's quote. Keyed by id so the quote form resets per job. */
const ProviderJobPage = () => {
  const { id = '' } = useParams();
  const user = useAppSelector(selectCurrentUser);
  if (!user) return <Navigate to={RouterKeys.PRO_LOGIN} replace />;
  return <ProviderJob key={id} id={id} user={user} />;
};

export default ProviderJobPage;
