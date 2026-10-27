import { useNavigate, useSearchParams } from 'react-router-dom';
import { Form } from 'antd';
import type { RegisterFormValues, RegisterLayoutProps } from '../client/default/auth/register.layout.types';
import { UserRole } from '../common/CommonEnum';
import { RouterKeys } from '../config/router/RouterKeys';
import { useSignupCode } from './useSignupCode';

/**
 * /pro/signup?email=&skill= behaviour: provider details + password, then the emailed code.
 * RegisterPage then opens the skills step.
 */
export const useRegister = (): RegisterLayoutProps => {
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
