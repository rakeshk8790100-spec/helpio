import type { GoogleOption } from '../client/default/auth/login.layout.types';
import { envConfig } from '../config/env.config';
import { apiErrorMessage } from '../lib/apiError';
import { useGoogleLoginMutation } from '../pages/auth/auth.api';

/**
 * Continue with Google for customers. A successful sign-in stores the session (auth.api) and the page
 * redirects; failures go to `onError`. Without a client ID, development builds get a reminder instead.
 */
export const useGoogleSignIn = (onError: (message: string | undefined) => void): GoogleOption | null => {
  const [googleLogin, { isLoading }] = useGoogleLoginMutation();

  if (!envConfig.googleClientId) return envConfig.isDev ? { configured: false } : null;
  return {
    configured: true,
    clientId: envConfig.googleClientId,
    loading: isLoading,
    onCredential: async (credential) => {
      onError(undefined);
      try {
        await googleLogin({ id_token: credential }).unwrap();
      } catch (e) {
        onError(apiErrorMessage(e));
      }
    },
  };
};
