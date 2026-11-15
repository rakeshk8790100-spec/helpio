import { startSessionOnSuccess, toAuthSession } from '@/common/CommonApi';
import type { SessionApiDto } from '@/common/CommonApi';
import type { AuthSession } from '@/common/CommonDto';
import { baseApi } from '@/config/base_service/base.api';
import { APIS } from '@/config/base_service/http.config';
import { toCodeSent } from '@/pages/admin/admin.api';
import type { AdminLoginDto } from '@/pages/admin/types/admin.dto';
import type { SignupCodeSent, VerifySignupDto } from '@/pages/auth/types/auth.dto';

/** Endpoints only this admin screen uses. */
export const adminLoginApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** Step 1: email and password; a code goes to the admin's email */
    adminLogin: builder.mutation<SignupCodeSent, AdminLoginDto>({
      query: (body) => ({ url: APIS.ADMIN.LOGIN, method: 'POST', body }),
      transformResponse: toCodeSent,
    }),
    /** Step 2: the code opens the admin session */
    adminVerify: builder.mutation<AuthSession, VerifySignupDto>({
      query: (body) => ({ url: APIS.ADMIN.LOGIN_VERIFY, method: 'POST', body }),
      transformResponse: (dto: SessionApiDto) => toAuthSession(dto),
      onQueryStarted: startSessionOnSuccess,
    }),
  }),
  overrideExisting: false,
});

export const { useAdminLoginMutation, useAdminVerifyMutation } = adminLoginApi;
