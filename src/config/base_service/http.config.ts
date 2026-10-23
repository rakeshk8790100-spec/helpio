import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { selectToken, signedOut } from '../../redux/authSlice';
import type { RootState } from '../../redux/store';
import { envConfig } from '../env.config';

/**
 * HTTP and API connection configurations
 */
export const HTTP_CONFIG = {
  BASE_URL: envConfig.apiBaseUrl,
  TIMEOUT: 30000,
} as const;

const rawBaseQuery = fetchBaseQuery({
  baseUrl: HTTP_CONFIG.BASE_URL,
  timeout: HTTP_CONFIG.TIMEOUT,
  prepareHeaders: (headers, { getState }) => {
    const token = selectToken(getState() as RootState);
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    headers.set('Accept', 'application/json');
    return headers;
  },
});

/**
 * Base query for every endpoint. When the API rejects the stored token
 * (expired, revoked or the account was disabled), the local session ends so guarded routes ask for login again.
 */
export const baseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  if (result.error?.status === 401 && selectToken(api.getState() as RootState)) {
    api.dispatch(signedOut());
  }
  return result;
};

export default baseQuery;
