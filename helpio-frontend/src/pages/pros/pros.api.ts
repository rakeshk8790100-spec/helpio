import type { ProviderCard, ProviderProfile, ProviderSearchResult, PublicSkill } from '../../common/CommonDto';
import { baseApi } from '../../config/base_service/base.api';
import type {
  ProviderCardApiDto,
  ProviderProfileApiDto,
  ProviderSearchApiDto,
  ProviderSearchArgs,
  PublicSkillApiDto,
} from './types/pros.dto';

const toSkill = (dto: PublicSkillApiDto): PublicSkill => ({
  skillId: dto.skill_id,
  name: dto.name,
  categoryId: dto.category_id,
  categoryName: dto.category_name,
  proficiency: dto.proficiency,
  yearsExperience: dto.years_experience,
});

const toCard = (dto: ProviderCardApiDto): ProviderCard => ({
  id: dto.id,
  displayName: dto.display_name,
  avatarUrl: dto.avatar_url,
  bioSnippet: dto.bio_snippet,
  areaName: dto.area_name,
  approxDistanceKm: dto.approx_distance_km,
  skills: dto.skills.map(toSkill),
  skillCount: dto.skill_count,
  topProficiency: dto.top_proficiency,
  maxYearsExperience: dto.max_years_experience,
  workDays: dto.work_days,
  memberSince: dto.member_since,
  rating: dto.rating,
});

/** Find pros who serve a place, and open their public profiles. */
export const prosApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    searchProviders: builder.query<ProviderSearchResult, ProviderSearchArgs>({
      query: (a) => ({
        // Repeated `skill_id=` params: `params` would join an array with commas
        url: a.skillIds?.length
          ? `/providers/search?${a.skillIds.map((id) => `skill_id=${encodeURIComponent(id)}`).join('&')}`
          : '/providers/search',
        params: {
          ...(a.q && { q: a.q }),
          ...(a.categoryId && { category_id: a.categoryId }),
          ...(a.addressId && { address_id: a.addressId }),
          ...(a.latitude !== undefined && a.longitude !== undefined && { latitude: a.latitude, longitude: a.longitude }),
          ...(a.page && a.page > 1 && { page: a.page }),
        },
      }),
      transformResponse: (dto: ProviderSearchApiDto): ProviderSearchResult => ({
        near: dto.near,
        providers: dto.providers.map(toCard),
        total: dto.total,
        hasMore: dto.has_more,
      }),
      // One cache entry per search; "Show more" pages are appended to it
      serializeQueryArgs: ({ queryArgs }) => ({ ...queryArgs, page: undefined }),
      merge: (cache, incoming, { arg }) =>
        arg.page && arg.page > 1 ? { ...incoming, providers: [...cache.providers, ...incoming.providers] } : incoming,
      forceRefetch: ({ currentArg, previousArg }) => currentArg?.page !== previousArg?.page,
      providesTags: ['Providers'],
    }),
    getProvider: builder.query<ProviderProfile, { id: string; addressId?: string }>({
      query: ({ id, addressId }) => ({ url: `/providers/${id}`, params: addressId ? { address_id: addressId } : {} }),
      transformResponse: (dto: ProviderProfileApiDto): ProviderProfile => ({
        ...toCard(dto),
        bio: dto.bio,
        categories: dto.categories.map((c) => ({ id: c.id, name: c.name, skills: c.skills.map(toSkill) })),
        // "09:00:00" → "09:00"
        availability: dto.availability.map((s) => ({ day: s.day, start: s.start.slice(0, 5), end: s.end.slice(0, 5) })),
        radiusKm: dto.radius_km,
        reviews: dto.reviews.map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          reviewerLabel: r.reviewer_label,
          createdAt: r.created_at,
        })),
      }),
      providesTags: ['Providers'],
    }),
  }),
  overrideExisting: false,
});

export const { useSearchProvidersQuery, useGetProviderQuery } = prosApi;
