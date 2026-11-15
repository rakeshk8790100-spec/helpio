import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { envConfig } from '@/config/env.config';
import { selectToken, signedOut } from '@/redux/authSlice';
import type { RootState } from '@/redux/store';

/**
 * HTTP and API connection configurations
 */
export const HTTP_CONFIG = {
  BASE_URL: envConfig.apiBaseUrl,
  TIMEOUT: 30000,
} as const;

/**
 * Every backend path, relative to HTTP_CONFIG.BASE_URL. `{{name}}` parts are filled in with
 * `replaceUrlPlaceholders(APIS.JOBS.DETAIL, { id })`.
 */
export const APIS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    GOOGLE: '/auth/google',
    REGISTER: '/auth/register',
    REGISTER_VERIFY: '/auth/register/verify',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    CHANGE_PASSWORD: '/auth/change-password',
    ME: '/auth/me',
    AVATAR: '/auth/me/avatar',
  },
  PUBLIC: {
    CONFIG: '/public-config',
    LANDING: '/landing',
    SERVICES: '/services',
  },
  CATALOG: {
    SKILLS: '/catalog/skills',
  },
  CUSTOMER: {
    HOME: '/customers/me/home',
    ADDRESSES: '/customers/me/addresses',
    ADDRESS: '/customers/me/addresses/{{id}}',
    FAVORITES: '/customers/me/favorites',
    FAVORITES_SKIP: '/customers/me/favorites/skip',
  },
  PROVIDER: {
    HOME: '/providers/me/home',
    ONBOARDING: '/providers/me/onboarding',
    PROFILE: '/providers/me/profile',
    SKILLS: '/providers/me/skills',
    SERVICE_SETUP: '/providers/me/service-setup',
    EARNINGS: '/providers/me/earnings',
    SEARCH: '/providers/search',
    PUBLIC_PROFILE: '/providers/{{id}}',
  },
  JOBS: {
    CREATE: '/jobs',
    ASSIST: '/jobs/assist',
    MINE: '/jobs/mine',
    DETAIL: '/jobs/{{id}}',
    ATTACHMENTS: '/jobs/{{jobId}}/attachments',
    ATTACHMENT: '/jobs/{{jobId}}/attachments/{{attachmentId}}',
    INVITES: '/jobs/{{jobId}}/invites',
    INVITE_DECLINE: '/jobs/{{jobId}}/invite/decline',
    QUOTES: '/jobs/{{jobId}}/quotes',
    MY_QUOTE: '/jobs/{{jobId}}/quotes/mine',
    QUOTE_ACCEPT: '/jobs/{{jobId}}/quotes/{{quoteId}}/accept',
    QUOTE_DECLINE: '/jobs/{{jobId}}/quotes/{{quoteId}}/decline',
    START: '/jobs/{{jobId}}/start',
    START_PIN_RESET: '/jobs/{{jobId}}/start-pin/reset',
    ESTIMATE: '/jobs/{{jobId}}/estimate',
    MILESTONES: '/jobs/{{jobId}}/milestones',
    MILESTONE_SUBMIT: '/jobs/{{jobId}}/milestones/{{stage}}/submit',
    MILESTONE_APPROVE: '/jobs/{{jobId}}/milestones/{{stage}}/approve',
    MILESTONE_CHANGES: '/jobs/{{jobId}}/milestones/{{stage}}/request-changes',
    PAYMENT: '/jobs/{{jobId}}/payment',
    PAYMENT_CONFIRM: '/jobs/{{jobId}}/payment/confirm',
    REVIEWS: '/jobs/{{jobId}}/reviews',
    MESSAGES: '/jobs/{{jobId}}/messages',
    NEARBY: '/jobs/nearby',
    NEARBY_DETAIL: '/jobs/nearby/{{id}}',
    PROVIDER_MINE: '/jobs/provider/mine',
  },
  NOTIFICATIONS: {
    LIST: '/notifications',
    UNREAD_COUNT: '/notifications/unread-count',
    READ: '/notifications/{{id}}/read',
    READ_ALL: '/notifications/read-all',
  },
  ADMIN: {
    LOGIN: '/admin/auth/login',
    LOGIN_VERIFY: '/admin/auth/verify',
    REQUEST_ACCESS: '/admin/auth/request-access',
    REQUEST_ACCESS_VERIFY: '/admin/auth/request-access/verify',
    DASHBOARD: '/admin/dashboard',
    STATUS: '/admin/status',
    ADMINS: '/admin/admins',
    ADMIN_APPROVE: '/admin/admins/{{id}}/approve',
    ADMIN_REJECT: '/admin/admins/{{id}}/reject',
    ADMIN_ACTIVE: '/admin/admins/{{id}}/{{action}}',
    APPROVALS: '/admin/approvals',
    APPROVALS_COUNT: '/admin/approvals/count',
    AUDIT: '/admin/audit',
    SETTINGS: '/admin/settings',
    SETTINGS_TEST: '/admin/settings/{{group}}/test',
    USERS: '/admin/users',
    USER: '/admin/users/{{id}}',
    USER_APPROVE: '/admin/users/{{id}}/approve',
    USER_REJECT: '/admin/users/{{id}}/reject',
    USER_ACTIVE: '/admin/users/{{id}}/{{action}}',
    USER_SIGN_OUT: '/admin/users/{{id}}/sign-out',
    JOBS: '/admin/jobs',
    JOB: '/admin/jobs/{{id}}',
    JOB_CANCEL: '/admin/jobs/{{id}}/cancel',
    JOB_MESSAGES: '/admin/jobs/{{id}}/messages',
    PAYMENTS: '/admin/payments',
    PAYMENT_RECHECK: '/admin/payments/{{id}}/recheck',
    PAYOUTS: '/admin/payouts',
    PAYOUT_PAID: '/admin/payouts/{{paymentId}}/paid',
    REVIEWS: '/admin/reviews',
    REVIEW_VISIBILITY: '/admin/reviews/{{id}}/{{action}}',
    CATALOG: '/admin/catalog',
    CATALOG_REQUESTS: '/admin/catalog/requests',
    CATALOG_REQUEST_APPROVE: '/admin/catalog/requests/{{key}}/approve',
    CATALOG_REQUEST_REJECT: '/admin/catalog/requests/{{key}}/reject',
    CATEGORIES: '/admin/catalog/categories',
    CATEGORY: '/admin/catalog/categories/{{id}}',
    SKILLS: '/admin/catalog/categories/{{categoryId}}/skills',
    SKILL: '/admin/catalog/categories/{{categoryId}}/skills/{{id}}',
  },
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
