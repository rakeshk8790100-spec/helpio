import { baseApi } from '@/config/base_service/base.api';
import { APIS } from '@/config/base_service/http.config';
import { replaceUrlPlaceholders } from '@/lib/utils';
import type { ApprovalItemApiDto } from '@/pages/admin/types/admin.dto';
import type { ApprovalItem } from '@/pages/admin/types/admin.models';

const toApproval = (dto: ApprovalItemApiDto): ApprovalItem => ({
  id: dto.id,
  role: dto.role,
  name: dto.name,
  email: dto.email,
  phone: dto.phone,
  approvalStatus: dto.approval_status,
  approvalNote: dto.approval_note,
  createdAt: dto.created_at,
  provider: dto.provider && {
    onboardingStatus: dto.provider.onboarding_status,
    skills: dto.provider.skills,
    areaName: dto.provider.area_name,
    pincode: dto.provider.pincode,
    radiusKm: dto.provider.radius_km,
    workDays: dto.provider.work_days,
    bio: dto.provider.bio,
  },
});

/** Endpoints only this admin screen uses. */
export const approvalsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getApprovals: builder.query<ApprovalItem[], 'customer' | 'provider' | undefined>({
      query: (role) => ({ url: APIS.ADMIN.APPROVALS, params: role ? { role } : {} }),
      transformResponse: (dto: ApprovalItemApiDto[]) => dto.map(toApproval),
      providesTags: ['Approvals'],
    }),
    approveUser: builder.mutation<ApprovalItem, string>({
      query: (id) => ({ url: replaceUrlPlaceholders(APIS.ADMIN.USER_APPROVE, { id }), method: 'POST', body: {} }),
      transformResponse: toApproval,
      invalidatesTags: ['Approvals', 'Audit'],
    }),
    rejectUser: builder.mutation<ApprovalItem, { id: string; reason: string }>({
      query: ({ id, reason }) => ({ url: replaceUrlPlaceholders(APIS.ADMIN.USER_REJECT, { id }), method: 'POST', body: { reason } }),
      transformResponse: toApproval,
      invalidatesTags: ['Approvals', 'Audit'],
    }),
  }),
  overrideExisting: false,
});

export const { useGetApprovalsQuery, useApproveUserMutation, useRejectUserMutation } = approvalsApi;
