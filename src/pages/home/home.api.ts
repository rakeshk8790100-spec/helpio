import { toJob, toNearbyJob, toRupees } from '../../common/CommonApi';
import type { CustomerHome, ProviderHome } from '../../common/CommonDto';
import { baseApi } from '../../config/base_service/base.api';
import type { CustomerHomeApiDto, ProviderHomeApiDto } from './types/home.dto';

/** One call per signed-in home screen. */
export const homeApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCustomerHome: builder.query<CustomerHome, void>({
      query: () => '/customers/me/home',
      transformResponse: (dto: CustomerHomeApiDto): CustomerHome => ({
        activeJob: dto.active_job && toJob(dto.active_job),
        awaitingDecision: dto.awaiting_decision.map(toJob),
        waitingForQuotes: dto.waiting_for_quotes.map(toJob),
        drafts: dto.drafts.map(toJob),
      }),
      providesTags: ['Jobs'],
    }),
    getProviderHome: builder.query<ProviderHome, void>({
      query: () => '/providers/me/home',
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
      providesTags: ['Jobs', 'Onboarding'],
    }),
  }),
  overrideExisting: false,
});

export const { useGetCustomerHomeQuery, useGetProviderHomeQuery } = homeApi;
