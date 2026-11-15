import { toMapCircle, toNearbyJob } from '@/common/CommonApi';
import type { NearbyJobs, ProviderJob } from '@/common/CommonDto';
import { baseApi, list } from '@/config/base_service/base.api';
import { APIS } from '@/config/base_service/http.config';
import type { NearbyFilters, NearbyJobsApiDto, ProviderJobApiDto } from './types/nearbyJobs.dto';

const toProviderJob = (dto: ProviderJobApiDto): ProviderJob => ({
  ...toNearbyJob(dto),
  customerName: dto.customer_name,
  startedAt: dto.started_at,
  amount: dto.amount_paise / 100,
  earned: dto.earned_paise / 100,
  milestoneStage: dto.milestone_stage,
  milestoneStatus: dto.milestone_status,
  nextDueAt: dto.next_due_at,
  unreadMessages: dto.unread_messages,
});

/** Endpoints only the nearbyJobs screen uses. */
export const nearbyJobsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** Jobs I was hired for, with progress */
    getProviderJobs: builder.query<ProviderJob[], 'active' | 'completed'>({
      query: (bucket) => ({ url: APIS.JOBS.PROVIDER_MINE, params: { bucket } }),
      transformResponse: (dto: ProviderJobApiDto[]) => dto.map(toProviderJob),
      providesTags: [list('Jobs'), 'Milestones'],
    }),
    getNearbyJobs: builder.query<NearbyJobs, NearbyFilters>({
      query: (f) => ({
        url: APIS.JOBS.NEARBY,
        params: {
          ...(f.categoryId && { category_id: f.categoryId }),
          ...(f.maxKm && { max_km: f.maxKm }),
          ...(f.hasBudget && { has_budget: true }),
          ...(f.urgentOnly && { urgent_only: true }),
        },
      }),
      transformResponse: (dto: NearbyJobsApiDto): NearbyJobs => ({
        area: dto.area && toMapCircle(dto.area),
        categories: dto.categories,
        jobs: dto.jobs.map(toNearbyJob),
      }),
      providesTags: [list('Jobs')],
    }),
  }),
  overrideExisting: false,
});

export const { useGetProviderJobsQuery, useGetNearbyJobsQuery } = nearbyJobsApi;
