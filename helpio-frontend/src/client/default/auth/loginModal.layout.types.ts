import type { SelfServiceRole } from '../../../common/CommonEnum';
import type { LoginLayoutProps } from './login.layout.types';

/* Contract between the header log-in popup (behaviour) and client/default/auth (markup). */

export interface LoginModalLayoutProps {
  /** null while the visitor is still choosing between customer and professional */
  role: SelfServiceRole | null;
  onChoose: (role: SelfServiceRole) => void;
  onBack: () => void;
  onClose: () => void;
  /** Goes to that audience's separate sign-up page */
  onSignup: (role: SelfServiceRole) => void;
  /** Props for the log-in form of the chosen role */
  login: LoginLayoutProps;
}
