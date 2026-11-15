import { baseApi } from '@/config/base_service/base.api';
import { APIS } from '@/config/base_service/http.config';
import { replaceUrlPlaceholders } from '@/lib/utils';
import { toPage, toReviewItem } from '@/pages/admin/admin.api';
import type { PageApiDto, UserDetailApiDto, UserFilters, UserRowApiDto } from '@/pages/admin/types/admin.dto';
import type { AdminUserDetail, AdminUserRow, Paged } from '@/pages/admin/types/admin.models';

const toUserRow = (dto: UserRowApiDto): AdminUserRow => ({
  id: dto.id,
  role: dto.role,
  name: dto.name,
  email: dto.email,
  phone: dto.phone,
  approvalStatus: dto.approval_status,
  isActive: dto.is_active,
  createdAt: dto.created_at,
  jobs: dto.jobs,
  ratingAverage: dto.rating_average,
  ratingCount: dto.rating_count,
});

const toUserDetail = (dto: UserDetailApiDto): AdminUserDetail => ({
  ...toUserRow(dto),
  approvalNote: dto.approval_note,
  approvedAt: dto.approved_at,
  provider: dto.provider && {
    onboardingStatus: dto.provider.onboarding_status,
    skills: dto.provider.skills,
    areaName: dto.provider.area_name,
    pincode: dto.provider.pincode,
    radiusKm: dto.provider.radius_km,
    workDays: dto.provider.work_days,
    bio: dto.provider.bio,
  },
  quotes: dto.quotes,
  jobList: dto.job_list.map((j) => ({
    id: j.id,
    title: j.title,
    status: j.status,
    amount: j.amount_paise === null ? null : j.amount_paise / 100,
    createdAt: j.created_at,
  })),
  reviewsReceived: dto.reviews_received.map(toReviewItem),
  reviewsGiven: dto.reviews_given,
  payments: dto.payments.map((p) => ({
    id: p.id,
    jobTitle: p.job_title,
    status: p.status,
    amount: p.amount_paise / 100,
    payoutStatus: p.payout_status,
    paidAt: p.paid_at,
    createdAt: p.created_at,
  })),
  earned: dto.earned_paise / 100,
  owed: dto.owed_paise / 100,
});

/** Endpoints only this admin screen uses. */
export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminUsers: builder.query<Paged<AdminUserRow>, UserFilters>({
      query: (f) => ({
        url: APIS.ADMIN.USERS,
        params: {
          page: f.page,
          page_size: f.pageSize,
          ...(f.role && { role: f.role }),
          ...(f.approval && { approval: f.approval }),
          ...(f.active !== undefined && { active: f.active }),
          ...(f.q && { q: f.q }),
        },
      }),
      transformResponse: (dto: PageApiDto<UserRowApiDto>) => toPage(dto, toUserRow),
      providesTags: ['AdminUsers'],
    }),
    getAdminUser: builder.query<AdminUserDetail, string>({
      query: (id) => replaceUrlPlaceholders(APIS.ADMIN.USER, { id }),
      transformResponse: toUserDetail,
      providesTags: ['AdminUsers'],
    }),
    setUserActive: builder.mutation<AdminUserDetail, { id: string; active: boolean; reason?: string }>({
      query: ({ id, active, reason }) => ({
        url: replaceUrlPlaceholders(APIS.ADMIN.USER_ACTIVE, { id, action: active ? 'activate' : 'deactivate' }),
        method: 'POST',
        ...(!active && { body: { reason: reason || null } }),
      }),
      transformResponse: toUserDetail,
      invalidatesTags: ['AdminUsers', 'Audit'],
    }),
    signOutUser: builder.mutation<AdminUserDetail, string>({
      query: (id) => ({ url: replaceUrlPlaceholders(APIS.ADMIN.USER_SIGN_OUT, { id }), method: 'POST' }),
      transformResponse: toUserDetail,
      invalidatesTags: ['AdminUsers', 'Audit'],
    }),
  }),
  overrideExisting: false,
});

export const { useGetAdminUsersQuery, useGetAdminUserQuery, useSetUserActiveMutation, useSignOutUserMutation } = usersApi;
