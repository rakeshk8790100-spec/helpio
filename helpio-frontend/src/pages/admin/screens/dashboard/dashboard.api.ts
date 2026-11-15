import { baseApi } from '@/config/base_service/base.api';
import { APIS } from '@/config/base_service/http.config';
import type { DashboardApiDto } from '@/pages/admin/types/admin.dto';
import type { AdminDashboard } from '@/pages/admin/types/admin.models';

const toDashboard = (dto: DashboardApiDto): AdminDashboard => ({
  users: {
    customers: dto.users.customers,
    providers: dto.users.providers,
    admins: dto.users.admins,
    pendingCustomers: dto.users.pending_customers,
    pendingProviders: dto.users.pending_providers,
    signupsToday: dto.users.signups_today,
    signupsWeek: dto.users.signups_week,
  },
  jobs: { byStatus: dto.jobs.by_status, postedToday: dto.jobs.posted_today },
  money: {
    paymentDueCount: dto.money.payment_due_count,
    paymentDueAmount: dto.money.payment_due_paise / 100,
    paidTodayCount: dto.money.paid_today_count,
    paidTodayAmount: dto.money.paid_today_paise / 100,
    failedTriesDay: dto.money.failed_tries_day,
    payoutsWaitingCount: dto.money.payouts_waiting_count,
    payoutsWaitingAmount: dto.money.payouts_waiting_paise / 100,
  },
  reviews: dto.reviews,
  activity: dto.activity.map((a) => ({
    id: a.id,
    type: a.type,
    actor: a.actor,
    jobId: a.job_id,
    jobTitle: a.job_title,
    data: a.data,
    at: a.at,
  })),
});

/** Endpoints only this admin screen uses. */
export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminDashboard: builder.query<AdminDashboard, void>({
      query: () => APIS.ADMIN.DASHBOARD,
      transformResponse: toDashboard,
      providesTags: ['Status'],
    }),
  }),
  overrideExisting: false,
});

export const { useGetAdminDashboardQuery } = dashboardApi;
