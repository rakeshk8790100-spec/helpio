import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { App, Form } from 'antd';
import type { ServiceAreaLayoutProps, ServiceSetupFormValues } from '../client/default/onboarding/onboarding.layout.types';
import type { ProviderOnboarding } from '../common/CommonDto';
import { RouterKeys } from '../config/router/RouterKeys';
import { apiErrorMessage } from '../lib/apiError';
import { useGetOnboardingQuery, useSaveServiceSetupMutation } from '../pages/onboarding/onboarding.api';
import { useCurrentLocation } from './useCurrentLocation';

const DEFAULTS: ServiceSetupFormValues = {
  days: [0, 1, 2, 3, 4, 5],
  start: '09:00',
  end: '18:00',
  pincode: '',
  areaName: '',
  radiusM: 10_000,
};

const savedValues = (data: ProviderOnboarding | undefined): ServiceSetupFormValues => {
  const area = data?.serviceArea;
  if (!data || !area || data.availability.length === 0) return DEFAULTS;
  return {
    days: data.availability.map((slot) => slot.day),
    start: data.availability[0].start,
    end: data.availability[0].end,
    pincode: area.pincode,
    areaName: area.areaName,
    radiusM: area.radiusM,
  };
};

/**
 * /onboarding/service-area behaviour: working days and hours, location and radius. Completes sign-up.
 * With `editing` (/profile/service-area) the same screen saves and returns to Profile.
 */
export const useServiceSetup = ({ editing = false }: { editing?: boolean } = {}): ServiceAreaLayoutProps => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const onboarding = useGetOnboardingQuery();
  const [save, { isLoading: saving }] = useSaveServiceSetupMutation();
  const [form] = Form.useForm<ServiceSetupFormValues>();
  const summary = Form.useWatch((values: ServiceSetupFormValues) => values, form) ?? {};
  const [error, setError] = useState<string>();
  const area = onboarding.data?.serviceArea;
  const location = useCurrentLocation(
    area?.latitude != null && area.longitude != null ? { latitude: area.latitude, longitude: area.longitude } : null,
  );
  const { coordinates } = location;

  if (onboarding.isLoading) return { loading: true };

  return {
    loading: false,
    editing,
    loadError: onboarding.isError,
    onRetry: () => void onboarding.refetch(),
    form,
    initialValues: savedValues(onboarding.data),
    summary,
    location,
    saving,
    error,
    onSubmit: async ({ days, start, end, pincode, areaName, radiusM }) => {
      setError(undefined);
      try {
        await save({
          availability: days.map((day) => ({ day, start, end })),
          serviceArea: {
            latitude: coordinates?.latitude ?? null,
            longitude: coordinates?.longitude ?? null,
            pincode,
            areaName: areaName.trim(),
            radiusM,
          },
        }).unwrap();
        if (editing) {
          message.success('Saved. Jobs near you now use your new area and hours.');
          navigate(RouterKeys.PROFILE);
        } else {
          message.success("You're all set! We'll show you jobs near you.");
          navigate(RouterKeys.HOME, { replace: true });
        }
      } catch (e) {
        setError(apiErrorMessage(e));
      }
    },
    onBack: () => navigate(editing ? RouterKeys.PROFILE : RouterKeys.ONBOARDING_SKILLS),
  };
};
