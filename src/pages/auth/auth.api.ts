import { startSessionOnSuccess, toAuthSession } from '../../common/CommonApi';
import type { AuthSession } from '../../common/CommonDto';
import { baseApi } from '../../config/base_service/base.api';
import type { GoogleLoginDto, NextStepDto, OtpStartDto, RegisterDto, ResendOtpDto, VerifyOtpDto } from './types/auth.dto';

/**
 * Sign-in endpoints. Customers and providers sign in with an emailed code; customers can also use Google.
 * Successful sign-ins store the session (see `startSessionOnSuccess`).
 */
export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** Emails a login code to an existing account, or answers `details` for a new email. */
    startOtp: builder.mutation<NextStepDto, OtpStartDto>({
      query: (body) => ({ url: '/auth/otp/start', method: 'POST', body }),
    }),
    /** Creates (or refreshes an unverified) account and emails a sign-up code. */
    register: builder.mutation<NextStepDto, RegisterDto>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
    }),
    verifyOtp: builder.mutation<AuthSession, VerifyOtpDto>({
      query: (body) => ({ url: '/auth/verify-otp', method: 'POST', body }),
      transformResponse: toAuthSession,
      onQueryStarted: startSessionOnSuccess,
    }),
    resendOtp: builder.mutation<NextStepDto, ResendOtpDto>({
      query: (body) => ({ url: '/auth/otp/resend', method: 'POST', body }),
    }),
    googleLogin: builder.mutation<AuthSession, GoogleLoginDto>({
      query: (body) => ({ url: '/auth/google', method: 'POST', body }),
      transformResponse: toAuthSession,
      onQueryStarted: startSessionOnSuccess,
    }),
  }),
  overrideExisting: false,
});

export const {
  useStartOtpMutation,
  useRegisterMutation,
  useVerifyOtpMutation,
  useResendOtpMutation,
  useGoogleLoginMutation,
} = authApi;
