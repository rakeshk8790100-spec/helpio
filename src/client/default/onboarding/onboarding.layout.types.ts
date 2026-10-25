import type { ComponentProps } from 'react';
import type { FormInstance } from 'antd';
import type { SkillPicker } from '../../../component/marketplace';
import type { WithLoading } from '../layout.types';

/* Contract between pages/onboarding (behaviour) and client/default/onboarding (markup). */

/** Provider sign-up steps, shown by StepProgress on every step (step 1 is /pro/signup) */
export const PROVIDER_SIGNUP_STEPS = ['Your details', 'Skills', 'Service area'];

export const MIN_SKILLS = 3;
export const MAX_SKILLS = 15;

export type SkillsLayoutProps = WithLoading<{
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

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export type ServiceAreaLayoutProps = WithLoading<{
  loadError: boolean;
  onRetry: () => void;
  form: FormInstance<ServiceSetupFormValues>;
  initialValues: ServiceSetupFormValues;
  /** Live values for the plain-language summary */
  summary: Partial<ServiceSetupFormValues>;
  location: {
    coordinates: Coordinates | null;
    locating: boolean;
    error?: string;
    onLocate: () => void;
    onClear: () => void;
  };
  onSubmit: (values: ServiceSetupFormValues) => void;
  saving: boolean;
  error?: string;
  onBack: () => void;
}>;
