import { useState } from 'react';
import { Form } from 'antd';
import type {
  CompleteProfileLayoutProps,
  DetailsFormValues,
} from '../client/default/auth/login.layout.types';
import type { AuthUser } from '../common/CommonDto';
import { useLogoutMutation, useUpdateMeMutation } from '../common/CommonApi';
import { apiErrorMessage } from '../lib/apiError';

/** Collects a missing name or mobile number; saving it lets LoginPage continue. */
export const useCompleteProfile = (user: AuthUser): CompleteProfileLayoutProps => {
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
