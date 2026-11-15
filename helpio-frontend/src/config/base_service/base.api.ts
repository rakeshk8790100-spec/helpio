import type { Dispatch, UnknownAction } from '@reduxjs/toolkit';
import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from './http.config';

/** Cache tags shared by all feature modules, so one feature can invalidate another's data. */
export const TAG_TYPES = ['Session', 'Catalog', 'Onboarding', 'Service', 'Jobs', 'Addresses', 'Providers', 'Messages', 'Milestones', 'Notifications', 'Favorites', 'Payment', 'Reviews', 'Admins', 'Audit', 'Approvals', 'Settings', 'Status', 'AdminUsers', 'AdminJobs', 'AdminPayments', 'AdminReviews', 'AdminCatalog'] as const;

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

/** Screens that change while you look: refresh when the tab returns or the connection comes back */
export const LIVE = { refetchOnFocus: true, refetchOnReconnect: true, skipPollingIfUnfocused: true } as const;

/** Cache tag for one record (e.g. one job), so changing it refreshes only what shows it */
export const one = <T extends TagType>(type: T, id: string) => ({ type, id });

/** Cache tag for the lists of a type (My jobs, homes, nearby jobs), refreshed when any record is added or changes */
export const list = <T extends TagType>(type: T) => ({ type, id: 'LIST' });

/** Poll every `ms`, but only while the tab is in view */
export const poll = (ms: number) => ({ pollingInterval: ms, skipPollingIfUnfocused: true }) as const;

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
