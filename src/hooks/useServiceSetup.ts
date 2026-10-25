import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { App, Form } from 'antd';
import type {
  Coordinates,
  ServiceAreaLayoutProps,
  ServiceSetupFormValues,
} from '../client/default/onboarding/onboarding.layout.types';
import type { ProviderOnboarding } from '../common/CommonDto';
import { RouterKeys } from '../config/router/RouterKeys';
import { apiErrorMessage } from '../lib/apiError';
import { useGetOnboardingQuery, useSaveServiceSetupMutation } from '../pages/onboarding/onboarding.api';

const DEFAULTS: ServiceSetupFormValues = {
  days: [0, 1, 2, 3, 4, 5],
  start: '09:00',
  end: '18:00',
  pincode: '',
  areaName: '',
  radiusM: 10_000,
};

const GEO_ERRORS: Record<number, string> = {
  1: 'Location permission is off. You can still continue with your pincode.',
  2: "We couldn't find your location. Check GPS, or continue with your pincode.",
  3: 'Finding your location took too long. Try again, or continue with your pincode.',
};

/** ~11 cm precision is plenty, and matches the database column */
const round6 = (value: number) => Math.round(value * 1e6) / 1e6;

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

/** /onboarding/service-area behaviour: working days and hours, location and radius. Completes sign-up. */
export const useServiceSetup = (): ServiceAreaLayoutProps => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const onboarding = useGetOnboardingQuery();
  const [save, { isLoading: saving }] = useSaveServiceSetupMutation();
  const [form] = Form.useForm<ServiceSetupFormValues>();
  const summary = Form.useWatch((values: ServiceSetupFormValues) => values, form) ?? {};
  // undefined until the provider locates or clears, so a saved location shows when they come back
  const [picked, setPicked] = useState<Coordinates | null | undefined>(undefined);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string>();
  const [error, setError] = useState<string>();

  if (onboarding.isLoading) return { loading: true };

  const area = onboarding.data?.serviceArea;
  const saved = area?.latitude != null && area.longitude != null ? { latitude: area.latitude, longitude: area.longitude } : null;
  const coordinates = picked === undefined ? saved : picked;

  return {
    loading: false,
    loadError: onboarding.isError,
    onRetry: () => void onboarding.refetch(),
    form,
    initialValues: savedValues(onboarding.data),
    summary,
    location: {
      coordinates,
      locating,
      error: geoError,
      onLocate: () => {
        if (!('geolocation' in navigator)) {
          setGeoError("This browser can't share your location. Continue with your pincode.");
          return;
        }
        setGeoError(undefined);
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => {
            setPicked({ latitude: round6(coords.latitude), longitude: round6(coords.longitude) });
            setLocating(false);
          },
          (geo) => {
            setGeoError(GEO_ERRORS[geo.code] ?? GEO_ERRORS[2]);
            setLocating(false);
          },
          { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
        );
      },
      onClear: () => setPicked(null),
    },
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
        message.success("You're all set! We'll show you jobs near you.");
        navigate(RouterKeys.HOME, { replace: true });
      } catch (e) {
        setError(apiErrorMessage(e));
      }
    },
    onBack: () => navigate(RouterKeys.ONBOARDING_SKILLS),
  };
};
