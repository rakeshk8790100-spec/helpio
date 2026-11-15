import { App } from 'antd';
import { useGetPublicConfigQuery } from '@/common/CommonApi';
import { envConfig } from '@/config/env.config';
import { apiErrorMessage } from '@/lib/apiError';
import { useGoogleLoginMutation } from '@/pages/auth/auth.api';
import type { GoogleOption } from '@/pages/auth/types/auth.dto';

/**
 * Continue with Google for customers. A successful sign-in stores the session (auth.api) and the page
 * redirects; failures go to `onError`. Without a client ID, development builds get a reminder instead.
 */
export const useGoogleSignIn = (onError: (message: string | undefined) => void): GoogleOption | null => {
  const { message } = App.useApp();
  const [googleLogin, { isLoading }] = useGoogleLoginMutation();
  // Set in the admin console, or VITE_GOOGLE_CLIENT_ID at build time
  const { data: config } = useGetPublicConfigQuery();
  const clientId = config?.googleClientId || envConfig.googleClientId;

  if (!clientId) return envConfig.isDev ? { configured: false } : null;
  return {
    configured: true,
    clientId,
    loading: isLoading,
    onCredential: async (credential) => {
      onError(undefined);
      try {
        const result = await googleLogin({ id_token: credential }).unwrap();
        if ('pendingApproval' in result) {
          message.success("Thanks! Your account is waiting for approval. We'll email you as soon as it's approved.", 8);
        }
      } catch (e) {
        onError(apiErrorMessage(e));
      }
    },
  };
};
