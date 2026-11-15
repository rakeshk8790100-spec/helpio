import { useLocation, useNavigate } from 'react-router-dom';
import { ComingSoon } from '@/components/common';
import { RouterKeys } from '@/config/router/RouterKeys';

/** A planned screen that isn't built yet ("soon") or a wrong address ("missing"). */
const FallbackPage = ({ kind }: { kind: 'soon' | 'missing' }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  return <ComingSoon kind={kind} path={pathname} onHome={() => navigate(RouterKeys.HOME)} />;
};

export default FallbackPage;
