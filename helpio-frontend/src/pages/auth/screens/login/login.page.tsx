import { Form } from 'antd';
import { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { CompleteProfileLayout, LoginLayout } from '@/clients';
import { useLogoutMutation, useUpdateMeMutation } from '@/common/CommonApi';
import type { AuthUser } from '@/common/CommonDto';
import { UserRole } from '@/common/CommonEnum';
import SuspenseWrapper from '@/components/wrapper/SuspenseWrapper';
import { useLogin } from '@/hooks/useLogin';
import { apiErrorMessage } from '@/lib/apiError';
import { homePath, needsProfile, safeNext } from '@/pages/auth/authRedirect';
import type { CompleteProfileLayoutProps, DetailsFormValues } from '@/pages/auth/types/auth.dto';
import { useAppSelector } from '@/redux';
import { selectCurrentUser } from '@/redux/authSlice';

/** Collects a missing name or mobile number; saving it lets LoginPage continue. */
const useCompleteProfile = (user: AuthUser): CompleteProfileLayoutProps => {
  const [form] = Form.useForm<DetailsFormValues>();
  const [updateMe, { isLoading }] = useUpdateMeMutation();
  const [logout] = useLogoutMutation();
  const [error, setError] = useState<string>();

  return {
    email: user.email,
    form,
    initialValues: { name: user.name ?? undefined, phone: user.phone?.replace(/^\+91/, '') },
    submitting: isLoading,
    error,
    onSubmit: async ({ name, phone }) => {
      setError(undefined);
      try {
        await updateMe({ name: name.trim(), phone }).unwrap();
      } catch (e) {
        setError(apiErrorMessage(e));
      }
    },
    onLogout: () => void logout(),
  };
};

const SignIn = () => <SuspenseWrapper><LoginLayout {...useLogin(UserRole.CUSTOMER)} /></SuspenseWrapper>;
const CompleteProfile = ({ user }: { user: AuthUser }) => <SuspenseWrapper><CompleteProfileLayout {...useCompleteProfile(user)} /></SuspenseWrapper>;

/** /login: customer log-in, finish a missing profile, then continue to `next` or the user's starting point. */
const LoginPage = () => {
  const user = useAppSelector(selectCurrentUser);
  const [params] = useSearchParams();

  if (!user) return <SignIn />;
  if (needsProfile(user)) return <CompleteProfile user={user} />;
  return <Navigate to={safeNext(params.get('next')) ?? homePath(user)} replace />;
};

export default LoginPage;
