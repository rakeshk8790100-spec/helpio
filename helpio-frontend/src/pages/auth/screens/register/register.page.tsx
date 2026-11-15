import { Form } from 'antd';
import { Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { RegisterLayout } from '@/clients';
import { UserRole } from '@/common/CommonEnum';
import SuspenseWrapper from '@/components/wrapper/SuspenseWrapper';
import { RouterKeys, withQuery } from '@/config/router/RouterKeys';
import { useSignupCode } from '@/hooks/useSignupCode';
import { homePath } from '@/pages/auth/authRedirect';
import type { RegisterFormValues, RegisterLayoutProps } from '@/pages/auth/types/auth.dto';
import { useAppSelector } from '@/redux';
import { selectCurrentUser } from '@/redux/authSlice';

/**
 * /pro/signup?email=&skill= behaviour: provider details + password, then the emailed code.
 * RegisterPage then opens the skills step.
 */
const useRegister = (): RegisterLayoutProps => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form] = Form.useForm<RegisterFormValues>();
  const signup = useSignupCode(UserRole.PROVIDER);

  return {
    form,
    initialValues: { email: params.get('email') ?? undefined },
    submitting: signup.sending,
    error: signup.error,
    onSubmit: ({ name, email, phone, password }) => {
      void signup.send({ name: name.trim(), email, phone, password });
    },
    code: signup.step,
    onLogin: () => navigate(RouterKeys.PRO_LOGIN),
    onSwitchAudience: () => navigate(RouterKeys.SIGNUP),
  };
};

const SignUp = () => <SuspenseWrapper><RegisterLayout {...useRegister()} /></SuspenseWrapper>;

/** /pro/signup: provider sign-up step 1. Signed-in users continue where they belong (new providers: skills). */
const RegisterPage = () => {
  const user = useAppSelector(selectCurrentUser);
  const [params] = useSearchParams();

  if (!user) return <SignUp />;
  const target = homePath(user);
  // Carry the skill picked in the landing calculator into the skills step
  const skill = params.get('skill');
  return (
    <Navigate to={skill && target === RouterKeys.ONBOARDING_SKILLS ? withQuery(target, { category: skill }) : target} replace />
  );
};

export default RegisterPage;
