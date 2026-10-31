import { startSessionOnSuccess, toAuthSession } from '../../common/CommonApi';
import type { SessionApiDto } from '../../common/CommonApi';
import type { AuthSession, SignInResult } from '../../common/CommonDto';
import { baseApi } from '../../config/base_service/base.api';
import type { Dispatch } from '@reduxjs/toolkit';
import { sessionStarted } from '../../redux/authSlice';

/** A sign-up code or Google sign-in: a session, or (a customer waiting for an admin) no session yet */
const toSignInResult = (dto: SessionApiDto | { email: string; approval_status: 'pending' }): SignInResult =>
  'access_token' in dto ? toAuthSession(dto) : { pendingApproval: true, email: dto.email };

/** Stores the session only when there is one */
const startSessionIfSignedIn = async (
  _: unknown,
  { dispatch, queryFulfilled }: { dispatch: Dispatch; queryFulfilled: Promise<{ data: SignInResult }> },
) => {
  try {
    const { data } = await queryFulfilled;
    if ('token' in data) dispatch(sessionStarted(data));
  } catch {
    // Handled by the caller.
  }
};
import type {
  ForgotPasswordDto,
  GoogleLoginDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  SignupCodeSent,
  VerifySignupDto,
} from './types/auth.dto';

/**
 * Sign-in endpoints. Customers and providers sign up (proving the email with a code) and log in with
 * email + password; customers can also use Google. Successful sign-ins store the session (see `startSessionOnSuccess`).
 */
export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** Sign-up step 1: emails a code. Sending the same details again resends it. */
    register: builder.mutation<SignupCodeSent, RegisterDto>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
      transformResponse: (dto: { email: string; resend_in: number; expires_in_minutes: number }) => ({
        email: dto.email,
        resendIn: dto.resend_in,
        expiresInMinutes: dto.expires_in_minutes,
      }),
    }),
    /** Sign-up step 2: the code creates the account and signs in (a customer waiting for approval gets no session). */
    verifySignup: builder.mutation<SignInResult, VerifySignupDto>({
      query: (body) => ({ url: '/auth/register/verify', method: 'POST', body }),
      transformResponse: toSignInResult,
      onQueryStarted: startSessionIfSignedIn,
    }),
    login: builder.mutation<AuthSession, LoginDto>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      transformResponse: toAuthSession,
      onQueryStarted: startSessionOnSuccess,
    }),
    googleLogin: builder.mutation<SignInResult, GoogleLoginDto>({
      query: (body) => ({ url: '/auth/google', method: 'POST', body }),
      transformResponse: toSignInResult,
      onQueryStarted: startSessionIfSignedIn,
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
  useVerifySignupMutation,
  useLoginMutation,
  useGoogleLoginMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
} = authApi;
