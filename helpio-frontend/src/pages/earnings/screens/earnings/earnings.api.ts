import { toRupees } from '../../common/CommonApi';
import type { ProviderEarnings } from '../../common/CommonDto';
import { baseApi } from '../../config/base_service/base.api';
import type { ProviderEarningsApiDto } from './types/earnings.dto';

/** The provider's paid jobs and Helpio's payouts to them. */
export const earningsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProviderEarnings: builder.query<ProviderEarnings, void>({
      query: () => '/providers/me/earnings',
      transformResponse: (dto: ProviderEarningsApiDto): ProviderEarnings => ({
        total: toRupees(dto.total_paise),
        week: toRupees(dto.week_paise),
        toReceive: toRupees(dto.to_receive_paise),
        received: toRupees(dto.received_paise),
        items: dto.items.map((item) => ({
          paymentId: item.payment_id,
          jobId: item.job_id,
          jobTitle: item.job_title,
          amount: toRupees(item.amount_paise),
          paidAt: item.paid_at,
          method: item.method,
          payoutStatus: item.payout_status,
          payoutReference: item.payout_reference,
          payoutAt: item.payout_at,
        })),
      }),
      providesTags: ['Payment', 'Jobs'],
    }),
  }),
  overrideExisting: false,
});

export const { useGetProviderEarningsQuery } = earningsApi;
