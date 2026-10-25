import type { OnboardingStatus, Proficiency } from '../../../common/CommonEnum';

/* Wire format (snake_case) of /providers/me/*; mapped to CommonDto entities in onboarding.api.ts. */

export interface ProviderSkillApiDto {
  skill_id: string;
  proficiency: Proficiency;
  years_experience: number | null;
}

/** Times are "HH:MM" on the way in and "HH:MM:SS" on the way out */
export interface AvailabilitySlotApiDto {
  day: number;
  start: string;
  end: string;
}

export interface ServiceAreaApiDto {
  latitude: number | null;
  longitude: number | null;
  pincode: string;
  area_name: string;
}

export interface OnboardingApiDto {
  status: OnboardingStatus;
  skills: ProviderSkillApiDto[];
  availability: AvailabilitySlotApiDto[];
  service_area: (ServiceAreaApiDto & { radius_m: number }) | null;
}

export interface SaveServiceSetupApiDto {
  availability: AvailabilitySlotApiDto[];
  service_area: ServiceAreaApiDto;
  radius_m: number;
}
