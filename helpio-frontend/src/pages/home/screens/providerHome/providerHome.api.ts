import { toNearbyJob, toRupees } from '@/common/CommonApi';
import type { ProviderHome } from '@/common/CommonDto';
import { baseApi, list } from '@/config/base_service/base.api';
import { APIS } from '@/config/base_service/http.config';
import type { ProviderHomeApiDto } from './types/providerHome.dto';

/** Everything the provider home needs in one call. */
export const providerHomeApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProviderHome: builder.query<ProviderHome, void>({
      query: () => APIS.PROVIDER.HOME,
      transformResponse: (dto: ProviderHomeApiDto): ProviderHome => ({
        onboardingStatus: dto.onboarding_status,
        checklist: dto.checklist,
        canQuote: dto.can_quote,
        activeJob: dto.active_job && toNearbyJob(dto.active_job),
        quotes: dto.quotes,
        invites: dto.invites.map(toNearbyJob),
        nearby: dto.nearby.map(toNearbyJob),
        nearbyCount: dto.nearby_count,
        earnings: { week: toRupees(dto.earnings.week_paise), wallet: toRupees(dto.earnings.wallet_paise) },
      }),
      providesTags: [list('Jobs'), 'Onboarding'],
    }),
  }),
  overrideExisting: false,
});

export const { useGetProviderHomeQuery } = providerHomeApi;
