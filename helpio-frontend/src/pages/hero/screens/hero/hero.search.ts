import { useState } from 'react';
import type { ComponentProps } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearchServicesQuery } from '../common/CommonApi';
import type { SearchBox } from '../component/marketplace';
import { RouterKeys, withQuery } from '../config/router/RouterKeys';
import { useDebouncedValue } from './useDebouncedValue';

/** Service search box behaviour (landing and customer home): debounced lookup, open a service or post a custom job. */
export const useServiceSearch = (): ComponentProps<typeof SearchBox> => {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const debounced = useDebouncedValue(value.trim());
  // Only search from 2 characters
  const term = debounced.length >= 2 ? debounced : '';
  const { data: results = [], isFetching } = useSearchServicesQuery(term, { skip: !term });

  return {
    value,
    onChange: setValue,
    term,
    results,
    loading: isFetching,
    onSelect: (s) => navigate(withQuery(RouterKeys.POST_JOB, { describe: s.name })),
    onPostCustom: (t) => navigate(withQuery(RouterKeys.POST_JOB, { describe: t })),
  };
};
