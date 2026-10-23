import type { Dispatch, UnknownAction } from '@reduxjs/toolkit';
import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from './http.config';

/** Cache tags shared by all feature modules, so one feature can invalidate another's data. */
export const TAG_TYPES = ['Session', 'Catalog', 'Onboarding', 'Service'] as const;

export type TagType = (typeof TAG_TYPES)[number];

/**
 * Single shared RTK Query API. Features add endpoints with `baseApi.injectEndpoints()` in their
 * `<feature>.api.ts`; never call `createApi` again.
 */
export const baseApi = createApi({
  reducerPath: 'baseApi',
  baseQuery,
  tagTypes: TAG_TYPES,
  endpoints: () => ({}),
});

export default baseApi;

/**
 * `onQueryStarted` helper: dispatch an action built from the response once the request succeeds.
 * Failures are left to the calling hook, which shows the error.
 */
export const dispatchOnSuccess =
  <T,>(toAction: (data: T) => UnknownAction) =>
  async (_: unknown, { dispatch, queryFulfilled }: { dispatch: Dispatch; queryFulfilled: Promise<{ data: T }> }) => {
    try {
      const { data } = await queryFulfilled;
      dispatch(toAction(data));
    } catch {
      // Handled by the caller.
    }
  };
