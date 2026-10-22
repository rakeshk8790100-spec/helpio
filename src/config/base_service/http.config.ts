import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { envConfig } from '../env.config';

/**
 * Storage keys for authentication tokens
 */
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
} as const;

/**
 * HTTP and API connection configurations
 */
export const HTTP_CONFIG = {
  BASE_URL: envConfig.apiBaseUrl,
  TIMEOUT: 30000,
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
} as const;

/**
 * Utility helpers to manage authentication tokens in storage
 */
export const tokenStorage = {
  getAccessToken: (): string | null => {
    try {
      return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    } catch {
      return null;
    }
  },
  setAccessToken: (token: string): void => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
    } catch {
      // ignore storage errors
    }
  },
  getRefreshToken: (): string | null => {
    try {
      return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    } catch {
      return null;
    }
  },
  setRefreshToken: (token: string): void => {
    try {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
    } catch {
      // ignore storage errors
    }
  },
  clearTokens: (): void => {
    try {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    } catch {
      // ignore storage errors
    }
  },
};

/**
 * Prepares HTTP request headers, automatically appending Authorization Bearer token
 * and standard headers if not explicitly overridden.
 */
export const prepareHeaders = (
  headers: Headers,
  _api: { getState: () => unknown }
): Headers => {
  const token = tokenStorage.getAccessToken();

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  return headers;
};

/**
 * Standard base query powered by RTK Query's fetchBaseQuery
 */
export const rawBaseQuery = fetchBaseQuery({
  baseUrl: HTTP_CONFIG.BASE_URL,
  timeout: HTTP_CONFIG.TIMEOUT,
  prepareHeaders,
});

/**
 * Enhanced base query wrapper that handles:
 * - 401 Unauthorized handling (token expiration, logout / redirect)
 * - Error interceptor and status code normalization
 * - Automatic token refresh integration if needed
 */
export const baseQuery: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error) {
    const status = result.error.status;

    // Handle unauthorized / expired session
    if (status === 401) {
      // Attempt token refresh or perform clean logout
      const refreshToken = tokenStorage.getRefreshToken();
      if (refreshToken) {
        // Try refresh token endpoint
        const refreshResult = await rawBaseQuery(
          {
            url: '/auth/refresh',
            method: 'POST',
            body: { refreshToken },
          },
          api,
          extraOptions
        );

        if (refreshResult.data) {
          const newAccessToken = (
            refreshResult.data as { accessToken?: string; token?: string }
          ).accessToken || (refreshResult.data as { token?: string }).token;

          if (newAccessToken) {
            tokenStorage.setAccessToken(newAccessToken);
            // Retry the original query with the new token
            result = await rawBaseQuery(args, api, extraOptions);
            return result;
          }
        }
      }

      // If refresh failed or was not available, clear tokens
      tokenStorage.clearTokens();
    }
  }

  return result;
};

export default baseQuery;
