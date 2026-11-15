import type { FormInstance } from 'antd';
import type { ComponentProps } from 'react';
import type { WithLoading } from '@/common/CommonDto';
import type { OnboardingStatus, Proficiency } from '@/common/CommonEnum';
import type { CurrentLocationButton, SkillPicker } from '@/components/common';

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
  bio: string | null;
  skills: ProviderSkillApiDto[];
  availability: AvailabilitySlotApiDto[];
  service_area: (ServiceAreaApiDto & { radius_m: number }) | null;
}

export interface SaveServiceSetupApiDto {
  availability: AvailabilitySlotApiDto[];
  service_area: ServiceAreaApiDto;
  radius_m: number;
}

/* Contract between pages/onboarding (behaviour) and client/default/onboarding (markup). */



export type SkillsLayoutProps = WithLoading<{
  /** Changing skills from Profile: no sign-up steps, "Save" returns to Profile */
  editing: boolean;
  /** Catalogue couldn't load; offer a retry */
  loadError: boolean;
  onRetry: () => void;
  picker: Omit<ComponentProps<typeof SkillPicker>, 'max'>;
  selectedCount: number;
  onContinue: () => void;
  saving: boolean;
  error?: string;
}>;

export interface ServiceSetupFormValues {
  /** Weekday indexes, 0 = Monday */
  days: number[];
  /** "HH:MM", 24h */
  start: string;
  end: string;
  pincode: string;
  areaName: string;
  /** Travel radius in metres */
  radiusM: number;
}

export type ServiceAreaLayoutProps = WithLoading<{
  /** Changing the area from Profile: no sign-up steps, "Save" returns to Profile */
  editing: boolean;
  loadError: boolean;
  onRetry: () => void;
  form: FormInstance<ServiceSetupFormValues>;
  initialValues: ServiceSetupFormValues;
  /** Live values for the plain-language summary */
  summary: Partial<ServiceSetupFormValues>;
  location: ComponentProps<typeof CurrentLocationButton>;
  onSubmit: (values: ServiceSetupFormValues) => void;
  saving: boolean;
  error?: string;
  onBack: () => void;
}>;
