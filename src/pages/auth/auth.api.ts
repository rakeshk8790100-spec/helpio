import { startSessionOnSuccess, toAuthSession } from '../../common/CommonApi';
import type { AuthSession } from '../../common/CommonDto';
import { baseApi } from '../../config/base_service/base.api';
import type { ForgotPasswordDto, GoogleLoginDto, LoginDto, RegisterDto, ResetPasswordDto } from './types/auth.dto';

/**
 * Sign-in endpoints. Customers and providers sign up and log in with email + password; customers can
 * also use Google. Successful sign-ins store the session (see `startSessionOnSuccess`).
 */
export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** Creates the account and signs in. */
    register: builder.mutation<AuthSession, RegisterDto>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
      transformResponse: toAuthSession,
      onQueryStarted: startSessionOnSuccess,
    }),
    login: builder.mutation<AuthSession, LoginDto>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      transformResponse: toAuthSession,
      onQueryStarted: startSessionOnSuccess,
    }),
    googleLogin: builder.mutation<AuthSession, GoogleLoginDto>({
      query: (body) => ({ url: '/auth/google', method: 'POST', body }),
      transformResponse: toAuthSession,
      onQueryStarted: startSessionOnSuccess,
    }),
    /** Emails a reset code. Answers the same whether or not the account exists. */
    forgotPassword: builder.mutation<void, ForgotPasswordDto>({
      query: (body) => ({ url: '/auth/forgot-password', method: 'POST', body }),
    }),
    /** Sets the new password and signs the account out everywhere; the user then logs in again. */
    resetPassword: builder.mutation<void, ResetPasswordDto>({
      query: (body) => ({ url: '/auth/reset-password', method: 'POST', body }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useRegisterMutation,
  useLoginMutation,
  useGoogleLoginMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
} = authApi;
