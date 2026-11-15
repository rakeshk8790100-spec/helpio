import { baseApi } from '../../config/base_service/base.api';
import { MOCK_LANDING } from './hero.mock';
import type { LandingDto } from './types/hero.dto';

/** Landing endpoints. Mocked via `queryFn` until the backend is ready (then `query: () => '/landing'`). */
export const heroApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getLanding: builder.query<LandingDto, void>({
      queryFn: () => new Promise((resolve) => setTimeout(() => resolve({ data: MOCK_LANDING }), 500)),
      providesTags: ['Service'],
    }),
  }),
  overrideExisting: false,
});

export const { useGetLandingQuery } = heroApi;
