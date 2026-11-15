import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginModalLayout } from '@/clients';
import { UserRole } from '@/common/CommonEnum';
import type { SelfServiceRole } from '@/common/CommonEnum';
import SuspenseWrapper from '@/components/wrapper/SuspenseWrapper';
import { RouterKeys } from '@/config/router/RouterKeys';
import { useLogin } from '@/hooks/useLogin';
import { needsProfile, pendingOnboardingPath } from '@/pages/auth/authRedirect';
import type { LoginModalLayoutProps } from '@/pages/auth/types/auth.dto';
import { useAppSelector } from '@/redux';
import { selectCurrentUser } from '@/redux/authSlice';

const SIGNUP_PAGE = { [UserRole.CUSTOMER]: RouterKeys.SIGNUP, [UserRole.PROVIDER]: RouterKeys.PRO_SIGNUP };

/** Header log-in popup behaviour: choose a role, log in, then close and resume any unfinished sign-up. */
const useLoginModal = (onClose: () => void): LoginModalLayoutProps => {
  const navigate = useNavigate();
  const user = useAppSelector(selectCurrentUser);
  const [role, setRole] = useState<SelfServiceRole | null>(null);
  const activeRole = role ?? UserRole.CUSTOMER;
  const login = useLogin(activeRole, {
    onNavigate: onClose,
    onSwitchAudience: () => setRole(activeRole === UserRole.CUSTOMER ? UserRole.PROVIDER : UserRole.CUSTOMER),
  });

  // Signed in (email or Google): close, and send customers missing details / providers mid-onboarding to finish
  useEffect(() => {
    if (!user) return;
    onClose();
    const unfinished = needsProfile(user) ? RouterKeys.LOGIN : pendingOnboardingPath(user);
    if (unfinished) void navigate(unfinished);
  }, [user, onClose, navigate]);

  return {
    role,
    onChoose: setRole,
    onBack: () => setRole(null),
    onClose,
    onSignup: (target) => {
      onClose();
      void navigate(SIGNUP_PAGE[target]);
    },
    login,
  };
};

/** Header log-in popup. Mounted only while open, so its log-in hooks (and Google) load on demand. */
const LoginModalPage = ({ onClose }: { onClose: () => void }) => <SuspenseWrapper fallback={null}><LoginModalLayout {...useLoginModal(onClose)} /></SuspenseWrapper>;

export default LoginModalPage;
