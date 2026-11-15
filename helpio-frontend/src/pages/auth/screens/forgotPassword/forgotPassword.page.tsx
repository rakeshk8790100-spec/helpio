import { App, Form } from 'antd';
import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ForgotPasswordLayout } from '@/clients';
import { UserRole } from '@/common/CommonEnum';
import type { SelfServiceRole } from '@/common/CommonEnum';
import SuspenseWrapper from '@/components/wrapper/SuspenseWrapper';
import { RouterKeys, withQuery } from '@/config/router/RouterKeys';
import { useCountdown } from '@/hooks/useCountdown';
import { apiErrorMessage } from '@/lib/apiError';
import { useForgotPasswordMutation, useResetPasswordMutation } from '@/pages/auth/auth.api';
import { homePath } from '@/pages/auth/authRedirect';
import type { ForgotPasswordLayoutProps, ResetEmailFormValues, ResetFormValues } from '@/pages/auth/types/auth.dto';
import { ResetStep } from '@/pages/auth/types/auth.enum';
import { useAppSelector } from '@/redux';
import { selectCurrentUser } from '@/redux/authSlice';

/** Matches the backend's minimum gap between two codes */
const RESEND_COOLDOWN_SECONDS = 60;

/** /forgot-password and /pro/forgot-password behaviour (`?email=` prefills). Ends on the matching log-in page. */
const useForgotPassword = (audience: SelfServiceRole): ForgotPasswordLayoutProps => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { message } = App.useApp();
  const [emailForm] = Form.useForm<ResetEmailFormValues>();
  const [resetForm] = Form.useForm<ResetFormValues>();
  const [step, setStep] = useState<ResetStep>(ResetStep.EMAIL);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const { secondsLeft, start } = useCountdown();
  const [forgotPassword, { isLoading: sending }] = useForgotPasswordMutation();
  const [resetPassword, { isLoading: resetting }] = useResetPasswordMutation();
  const loginPath = audience === UserRole.PROVIDER ? RouterKeys.PRO_LOGIN : RouterKeys.LOGIN;

  /** True once the backend accepted the request (it never says whether the account exists) */
  const sendCode = async (to: string) => {
    setError(undefined);
    try {
      await forgotPassword({ email: to }).unwrap();
      start(RESEND_COOLDOWN_SECONDS);
      return true;
    } catch (e) {
      setError(apiErrorMessage(e));
      return false;
    }
  };

  return {
    audience,
    step,
    email,
    error,
    emailForm: {
      form: emailForm,
      initialValues: { email: params.get('email') ?? undefined },
      submitting: sending && step === ResetStep.EMAIL,
      onSubmit: async (values) => {
        if (!(await sendCode(values.email))) return;
        setEmail(values.email);
        setStep(ResetStep.CODE);
      },
    },
    resetForm: {
      form: resetForm,
      submitting: resetting,
      onSubmit: async ({ otp, password }) => {
        setError(undefined);
        try {
          await resetPassword({ email, otp, new_password: password }).unwrap();
          message.success('Password updated. Log in with your new password.');
          void navigate(withQuery(loginPath, { email }), { replace: true });
        } catch (e) {
          setError(apiErrorMessage(e));
          resetForm.setFieldValue('otp', '');
        }
      },
    },
    resendIn: secondsLeft,
    resending: sending && step === ResetStep.CODE,
    onResend: async () => {
      if (await sendCode(email)) message.success('We sent a new code');
    },
    onChangeEmail: () => {
      setError(undefined);
      setStep(ResetStep.EMAIL);
    },
    onBackToLogin: () => navigate(loginPath),
  };
};

const ResetPassword = ({ audience }: { audience: SelfServiceRole }) => (
  <SuspenseWrapper><ForgotPasswordLayout {...useForgotPassword(audience)} /></SuspenseWrapper>
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
