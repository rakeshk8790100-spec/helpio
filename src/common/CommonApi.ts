import { baseApi } from '../config/base_service/base.api';
import type { Service } from './CommonDto';
import { MOCK_SERVICES } from './CommonMock';

/** Endpoints shared by several screens (landing, search, future booking screens). */
export const commonApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Mocked until the backend is ready; replace with `query: (q) => ({ url: '/services', params: { q } })`
    searchServices: builder.query<Service[], string>({
      queryFn: (q) => {
        const term = q.trim().toLowerCase();
        const data = MOCK_SERVICES.filter((s) => s.name.toLowerCase().includes(term));
        return new Promise((resolve) => setTimeout(() => resolve({ data }), 200));
      },
      providesTags: ['Service'],
    }),
  }),
  overrideExisting: false,
});

export const { useSearchServicesQuery } = commonApi;
