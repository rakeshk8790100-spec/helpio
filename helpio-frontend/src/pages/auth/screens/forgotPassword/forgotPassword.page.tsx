import { Navigate } from 'react-router-dom';
import ForgotPasswordLayout from '../../../../client/default/auth/forgotPassword.layout';
import { UserRole } from '../../../../common/CommonEnum';
import type { SelfServiceRole } from '../../../../common/CommonEnum';
import { useAppSelector } from '../../../../redux';
import { selectCurrentUser } from '../../../../redux/authSlice';
import { homePath } from '../../authRedirect';
import { useForgotPassword } from '../../../../hooks/useForgotPassword';

const ResetPassword = ({ audience }: { audience: SelfServiceRole }) => (
  <ForgotPasswordLayout {...useForgotPassword(audience)} />
);

/** Email code, then a new password. Signed-in users don't need it. */
const ForgotPasswordPage = ({ audience }: { audience: SelfServiceRole }) => {
  const user = useAppSelector(selectCurrentUser);
  if (user) return <Navigate to={homePath(user)} replace />;
  return <ResetPassword audience={audience} />;
};

/** /forgot-password */
export const CustomerForgotPasswordPage = () => <ForgotPasswordPage audience={UserRole.CUSTOMER} />;
/** /pro/forgot-password */
export const ProForgotPasswordPage = () => <ForgotPasswordPage audience={UserRole.PROVIDER} />;
