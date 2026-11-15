import type { ApprovalStatus } from '@/common/CommonEnum';
import { baseApi } from '@/config/base_service/base.api';
import { APIS } from '@/config/base_service/http.config';
import { toCodeSent } from '@/pages/admin/admin.api';
import type { AccessRequestDto } from '@/pages/admin/types/admin.dto';
import type { SignupCodeSent, VerifySignupDto } from '@/pages/auth/types/auth.dto';

/** Endpoints only this admin screen uses. */
export const adminRequestAccessApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    requestAdminAccess: builder.mutation<SignupCodeSent, AccessRequestDto>({
      query: (body) => ({ url: APIS.ADMIN.REQUEST_ACCESS, method: 'POST', body }),
      transformResponse: toCodeSent,
    }),
    /** The code creates the request; the owner's own address is approved at once */
    verifyAdminAccess: builder.mutation<{ email: string; approvalStatus: ApprovalStatus }, VerifySignupDto>({
      query: (body) => ({ url: APIS.ADMIN.REQUEST_ACCESS_VERIFY, method: 'POST', body }),
      transformResponse: (dto: { email: string; approval_status: ApprovalStatus }) => ({
        email: dto.email,
        approvalStatus: dto.approval_status,
      }),
    }),
  }),
  overrideExisting: false,
});

export const { useRequestAdminAccessMutation, useVerifyAdminAccessMutation } = adminRequestAccessApi;
