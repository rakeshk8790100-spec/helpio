import { useState } from 'react';
import type { ComponentProps } from 'react';
import type { Coordinates } from '../common/CommonDto';
import type { CurrentLocationButton } from '../component/marketplace';

const GEO_ERRORS: Record<number, string> = {
  1: 'Location permission is off. You can still continue with your pincode.',
  2: "We couldn't find your location. Check GPS, or continue with your pincode.",
  3: 'Finding your location took too long. Try again, or continue with your pincode.',
};

/** ~11 cm precision is plenty, and matches the database columns */
const round6 = (value: number) => Math.round(value * 1e6) / 1e6;

/**
 * "Use my current location": browser geolocation with friendly errors. `saved` is shown until the
 * user locates again or clears it. Pincode and area stay the fallback.
 */
export const useCurrentLocation = (saved: Coordinates | null): ComponentProps<typeof CurrentLocationButton> => {
  // undefined until the user locates or clears, so a saved location shows when they come back
  const [picked, setPicked] = useState<Coordinates | null | undefined>(undefined);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string>();

  return {
    coordinates: picked === undefined ? saved : picked,
    locating,
    error,
    onLocate: () => {
      if (!('geolocation' in navigator)) {
        setError("This browser can't share your location. Continue with your pincode.");
        return;
      }
      setError(undefined);
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          setPicked({ latitude: round6(coords.latitude), longitude: round6(coords.longitude) });
          setLocating(false);
        },
        (geo) => {
          setError(GEO_ERRORS[geo.code] ?? GEO_ERRORS[2]);
          setLocating(false);
        },
        { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
      );
    },
    onClear: () => setPicked(null),
  };
};
