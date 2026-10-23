import type { AvailabilitySlot, ProviderOnboarding, ProviderSkill, ServiceArea, SkillCategory } from '../../common/CommonDto';
import { baseApi, dispatchOnSuccess } from '../../config/base_service/base.api';
import { onboardingStatusChanged } from '../../redux/authSlice';
import type { OnboardingApiDto, ProviderSkillApiDto, SaveServiceSetupApiDto } from './types/onboarding.dto';

const toOnboarding = (dto: OnboardingApiDto): ProviderOnboarding => ({
  status: dto.status,
  skills: dto.skills.map((s) => ({ skillId: s.skill_id, proficiency: s.proficiency, yearsExperience: s.years_experience })),
  // "09:00:00" → "09:00"
  availability: dto.availability.map((slot) => ({ day: slot.day, start: slot.start.slice(0, 5), end: slot.end.slice(0, 5) })),
  serviceArea: dto.service_area && {
    latitude: dto.service_area.latitude,
    longitude: dto.service_area.longitude,
    pincode: dto.service_area.pincode,
    areaName: dto.service_area.area_name,
    radiusKm: dto.service_area.radius_km,
  },
});

/** Saving a step moves sign-up forward; mirror the new status into the session so routing follows. */
const syncStatus = dispatchOnSuccess<ProviderOnboarding>((data) => onboardingStatusChanged(data.status));

/** Provider onboarding: skills catalogue, then skills, availability and service area. */
export const onboardingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSkillCatalog: builder.query<SkillCategory[], void>({
      query: () => '/catalog/skills',
      providesTags: ['Catalog'],
    }),
    getOnboarding: builder.query<ProviderOnboarding, void>({
      query: () => '/providers/me/onboarding',
      transformResponse: toOnboarding,
      providesTags: ['Onboarding'],
    }),
    saveSkills: builder.mutation<ProviderOnboarding, ProviderSkill[]>({
      query: (skills) => ({
        url: '/providers/me/skills',
        method: 'PUT',
        body: {
          skills: skills.map((s): ProviderSkillApiDto => ({
            skill_id: s.skillId, proficiency: s.proficiency, years_experience: s.yearsExperience,
          })),
        },
      }),
      transformResponse: toOnboarding,
      invalidatesTags: ['Onboarding'],
      onQueryStarted: syncStatus,
    }),
    saveServiceSetup: builder.mutation<ProviderOnboarding, { availability: AvailabilitySlot[]; serviceArea: ServiceArea }>({
      query: ({ availability, serviceArea }) => ({
        url: '/providers/me/service-setup',
        method: 'PUT',
        body: {
          availability,
          service_area: {
            latitude: serviceArea.latitude,
            longitude: serviceArea.longitude,
            pincode: serviceArea.pincode,
            area_name: serviceArea.areaName,
          },
          radius_km: serviceArea.radiusKm,
        } satisfies SaveServiceSetupApiDto,
      }),
      transformResponse: toOnboarding,
      invalidatesTags: ['Onboarding'],
      onQueryStarted: syncStatus,
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetSkillCatalogQuery,
  useGetOnboardingQuery,
  useSaveSkillsMutation,
  useSaveServiceSetupMutation,
} = onboardingApi;
