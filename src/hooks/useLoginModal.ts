import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LoginModalLayoutProps } from '../client/default/auth/loginModal.layout.types';
import { UserRole } from '../common/CommonEnum';
import type { SelfServiceRole } from '../common/CommonEnum';
import { RouterKeys } from '../config/router/RouterKeys';
import { needsProfile, pendingOnboardingPath } from '../pages/auth/authRedirect';
import { useAppSelector } from '../redux';
import { selectCurrentUser } from '../redux/authSlice';
import { useLogin } from './useLogin';

const SIGNUP_PAGE = { [UserRole.CUSTOMER]: RouterKeys.SIGNUP, [UserRole.PROVIDER]: RouterKeys.PRO_SIGNUP };

/** Header log-in popup behaviour: choose a role, log in, then close and resume any unfinished sign-up. */
export const useLoginModal = (onClose: () => void): LoginModalLayoutProps => {
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
    if (unfinished) navigate(unfinished);
  }, [user, onClose, navigate]);

  return {
    role,
    onChoose: setRole,
    onBack: () => setRole(null),
    onClose,
    onSignup: (target) => {
      onClose();
      navigate(SIGNUP_PAGE[target]);
    },
    login,
  };
};
