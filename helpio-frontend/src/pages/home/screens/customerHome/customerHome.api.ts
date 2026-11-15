import { toJob } from '@/common/CommonApi';
import type { CustomerHome } from '@/common/CommonDto';
import { baseApi, list } from '@/config/base_service/base.api';
import { APIS } from '@/config/base_service/http.config';
import type { CustomerHomeApiDto } from './types/customerHome.dto';

/** Everything the customer home needs in one call. */
export const customerHomeApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCustomerHome: builder.query<CustomerHome, void>({
      query: () => APIS.CUSTOMER.HOME,
      transformResponse: (dto: CustomerHomeApiDto): CustomerHome => ({
        activeJob: dto.active_job && toJob(dto.active_job),
        awaitingDecision: dto.awaiting_decision.map(toJob),
        waitingForQuotes: dto.waiting_for_quotes.map(toJob),
        drafts: dto.drafts.map(toJob),
      }),
      providesTags: [list('Jobs')],
    }),
  }),
  overrideExisting: false,
});

export const { useGetCustomerHomeQuery } = customerHomeApi;
