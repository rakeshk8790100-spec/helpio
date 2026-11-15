import { baseApi } from '@/config/base_service/base.api';
import { APIS } from '@/config/base_service/http.config';
import { replaceUrlPlaceholders } from '@/lib/utils';
import { toPage } from '@/pages/admin/admin.api';
import type { PageApiDto, PaymentRowApiDto, PayoutApiDto } from '@/pages/admin/types/admin.dto';
import type { AdminPaymentRow, AdminPayout, Paged } from '@/pages/admin/types/admin.models';

const toPaymentRow = (dto: PaymentRowApiDto): AdminPaymentRow => ({
  id: dto.id,
  jobId: dto.job_id,
  jobTitle: dto.job_title,
  customer: dto.customer,
  pro: dto.pro,
  amount: dto.amount_paise / 100,
  status: dto.status,
  method: dto.method,
  lastError: dto.last_error,
  tries: dto.tries,
  failedTries: dto.failed_tries,
  payoutStatus: dto.payout_status,
  createdAt: dto.created_at,
  paidAt: dto.paid_at,
});

const toPayout = (dto: PayoutApiDto): AdminPayout => ({
  paymentId: dto.payment_id,
  jobTitle: dto.job_title,
  providerName: dto.provider_name,
  providerEmail: dto.provider_email,
  providerPhone: dto.provider_phone,
  amount: dto.amount_paise / 100,
  paidAt: dto.paid_at,
  payoutStatus: dto.payout_status,
  payoutReference: dto.payout_reference,
  payoutAt: dto.payout_at,
});

/** Endpoints only this admin screen uses. */
export const paymentsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminPayments: builder.query<Paged<AdminPaymentRow>, { page: number; pageSize: number; status?: string }>({
      query: (f) => ({ url: APIS.ADMIN.PAYMENTS, params: { page: f.page, page_size: f.pageSize, ...(f.status && { status: f.status }) } }),
      transformResponse: (dto: PageApiDto<PaymentRowApiDto>) => toPage(dto, toPaymentRow),
      providesTags: ['AdminPayments'],
    }),
    recheckPayment: builder.mutation<AdminPaymentRow, string>({
      query: (id) => ({ url: replaceUrlPlaceholders(APIS.ADMIN.PAYMENT_RECHECK, { id }), method: 'POST' }),
      transformResponse: toPaymentRow,
      invalidatesTags: ['AdminPayments', 'Audit', 'Status'],
    }),
    getPayouts: builder.query<AdminPayout[], 'pending' | 'paid'>({
      query: (status) => ({ url: APIS.ADMIN.PAYOUTS, params: { status } }),
      transformResponse: (dto: PayoutApiDto[]) => dto.map(toPayout),
      providesTags: ['AdminPayments'],
    }),
    markPayoutSent: builder.mutation<AdminPayout, { paymentId: string; reference: string }>({
      query: ({ paymentId, reference }) => ({ url: replaceUrlPlaceholders(APIS.ADMIN.PAYOUT_PAID, { paymentId }), method: 'POST', body: { reference } }),
      transformResponse: toPayout,
      invalidatesTags: ['AdminPayments', 'Audit', 'Status'],
    }),
  }),
  overrideExisting: false,
});

export const { useGetAdminPaymentsQuery, useRecheckPaymentMutation, useGetPayoutsQuery, useMarkPayoutSentMutation } = paymentsApi;
