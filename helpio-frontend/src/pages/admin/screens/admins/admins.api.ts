import { baseApi } from '@/config/base_service/base.api';
import { APIS } from '@/config/base_service/http.config';
import { replaceUrlPlaceholders } from '@/lib/utils';
import type { AdminApiDto } from '@/pages/admin/types/admin.dto';
import type { AdminAccount } from '@/pages/admin/types/admin.models';

const toAdmin = (dto: AdminApiDto): AdminAccount => ({
  id: dto.id,
  name: dto.name,
  email: dto.email,
  phone: dto.phone,
  approvalStatus: dto.approval_status,
  approvalNote: dto.approval_note,
  isActive: dto.is_active,
  isOwner: dto.is_owner,
  createdAt: dto.created_at,
  approvedAt: dto.approved_at,
});

/** Endpoints only this admin screen uses. */
export const adminsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdmins: builder.query<AdminAccount[], void>({
      query: () => APIS.ADMIN.ADMINS,
      transformResponse: (dto: AdminApiDto[]) => dto.map(toAdmin),
      providesTags: ['Admins'],
    }),
    approveAdmin: builder.mutation<AdminAccount, string>({
      query: (id) => ({ url: replaceUrlPlaceholders(APIS.ADMIN.ADMIN_APPROVE, { id }), method: 'POST' }),
      transformResponse: toAdmin,
      invalidatesTags: ['Admins', 'Audit'],
    }),
    rejectAdmin: builder.mutation<AdminAccount, { id: string; reason: string }>({
      query: ({ id, reason }) => ({ url: replaceUrlPlaceholders(APIS.ADMIN.ADMIN_REJECT, { id }), method: 'POST', body: { reason } }),
      transformResponse: toAdmin,
      invalidatesTags: ['Admins', 'Audit'],
    }),
    setAdminActive: builder.mutation<AdminAccount, { id: string; active: boolean; reason?: string }>({
      query: ({ id, active, reason }) => ({
        url: replaceUrlPlaceholders(APIS.ADMIN.ADMIN_ACTIVE, { id, action: active ? 'activate' : 'deactivate' }),
        method: 'POST',
        ...(!active && { body: { reason: reason || null } }),
      }),
      transformResponse: toAdmin,
      invalidatesTags: ['Admins', 'Audit'],
    }),
  }),
  overrideExisting: false,
});

export const { useGetAdminsQuery, useApproveAdminMutation, useRejectAdminMutation, useSetAdminActiveMutation } = adminsApi;
