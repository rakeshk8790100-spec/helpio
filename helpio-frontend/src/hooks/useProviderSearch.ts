import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { ProviderSearchLayoutProps } from '../client/default/pros/pros.layout.types';
import { useGetSkillCatalogQuery } from '../common/CommonApi';
import { RouterKeys, toPath, withQuery } from '../config/router/RouterKeys';
import { apiErrorMessage } from '../lib/apiError';
import { useGetAddressesQuery } from '../pages/profile/profile.api';
import { useSearchProvidersQuery } from '../pages/pros/pros.api';
import type { ProviderSearchArgs } from '../pages/pros/types/pros.dto';
import { useCurrentLocation } from './useCurrentLocation';
import { useDebouncedValue } from './useDebouncedValue';

const CURRENT = 'current';
const LABEL = { home: 'Home', work: 'Work', other: 'Other' };

/**
 * /search?q=&category=: pros who serve the chosen place (default address first, or the device location),
 * filtered by skill text or category. Search text and category live in the URL so Back keeps them.
 */
export const useProviderSearch = (): ProviderSearchLayoutProps => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const catalog = useGetSkillCatalogQuery();
  const addresses = useGetAddressesQuery();
  const location = useCurrentLocation(null);
  const [query, setQuery] = useState(() => params.get('q') ?? '');
  const [pickedPlace, setPickedPlace] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(query.trim(), 350);
  const categoryId = params.get('category') ?? '';

  const saved = addresses.data ?? [];
  const place = pickedPlace ?? saved.find((a) => a.isDefault)?.id ?? (location.coordinates ? CURRENT : null);
  const coordinates = place === CURRENT ? location.coordinates : null;
  const where: ProviderSearchArgs | null =
    place === CURRENT ? (coordinates ? { ...coordinates } : null) : place ? { addressId: place } : null;
  const args: ProviderSearchArgs = { ...where, q: q || undefined, categoryId: categoryId || undefined, page };
  const search = useSearchProvidersQuery(args, { skip: !where });

  // A new search starts again at page 1
  const restart = <T,>(apply: (value: T) => void) => (value: T) => {
    setPage(1);
    apply(value);
  };
  const locateMe = () => {
    setPage(1);
    setPickedPlace(CURRENT);
    location.onLocate();
  };

  const needsLocation = !addresses.isLoading && saved.length === 0 && !location.coordinates;

  return {
    query,
    onQueryChange: restart((value: string) => {
      setQuery(value);
      setParams((p) => {
        if (value.trim()) p.set('q', value);
        else p.delete('q');
        return p;
      }, { replace: true });
    }),
    categories: [{ value: '', label: 'All' }, ...(catalog.data ?? []).map((c) => ({ value: c.id, label: c.name }))],
    categoryId,
    onCategoryChange: restart((id: string) =>
      setParams((p) => {
        if (id) p.set('category', id);
        else p.delete('category');
        return p;
      }, { replace: true }),
    ),
    places: [
      ...saved.map((a) => ({ value: a.id, label: `${LABEL[a.label]} · ${a.areaName}` })),
      { value: CURRENT, label: location.coordinates ? 'My current location' : 'Use my current location' },
    ],
    place: place ?? '',
    onPlaceChange: (value) => (value === CURRENT ? locateMe() : restart(setPickedPlace)(value)),
    locating: location.locating,
    needsLocation: needsLocation
      ? {
          onUseCurrent: locateMe,
          onAddAddress: () => navigate(RouterKeys.PROFILE),
          error: location.error,
        }
      : null,
    results: needsLocation
      ? null
      : addresses.isLoading || !where || (search.isFetching && page === 1)
        ? { status: 'loading' }
        : !search.data
          ? { status: 'error', message: apiErrorMessage(search.error), onRetry: search.refetch }
          : {
              status: 'ready',
              near: place === CURRENT ? 'your location' : search.data.near,
              total: search.data.total,
              items: search.data.providers.map((provider) => ({
                provider,
                onOpen: () => navigate(toPath(RouterKeys.PRO_PROFILE, { id: provider.id })),
              })),
              hasMore: search.data.hasMore,
              loadingMore: search.isFetching && page > 1,
              onLoadMore: () => setPage((n) => n + 1),
              onPostJob: () => navigate(withQuery(RouterKeys.POST_JOB, q ? { title: q } : {})),
            },
  };
};
