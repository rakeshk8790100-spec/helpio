export const RouterKeys = {
  HOME: '/',
  SEARCH: '/search',
  PROFILE: '/profile',
  /** Customer log-in, sign-up and password reset */
  LOGIN: '/login',
  SIGNUP: '/signup',
  FORGOT_PASSWORD: '/forgot-password',
  /** Provider log-in, sign-up step 1 and password reset */
  PRO_LOGIN: '/pro/login',
  PRO_SIGNUP: '/pro/signup',
  PRO_FORGOT_PASSWORD: '/pro/forgot-password',
  /** Provider sign-up step 2 */
  ONBOARDING_SKILLS: '/onboarding/skills',
  /** Provider sign-up step 3 */
  ONBOARDING_AREA: '/onboarding/service-area',
  BOOKINGS: '/bookings',
  POST_JOB: '/jobs/new',
  SERVICE_DETAIL: '/services/:id',
  CATEGORY: '/categories/:id',
} as const;

/** Fill `:param` segments, e.g. toPath(RouterKeys.SERVICE_DETAIL, { id: 's1' }). */
export const toPath = (path: string, params: Record<string, string> = {}) =>
  path.replace(/:(\w+)/g, (_, key: string) => params[key] ?? key);

/** Append query params, e.g. withQuery(RouterKeys.POST_JOB, { emergency: '1' }). */
export const withQuery = (path: string, params: Record<string, string>) =>
  `${path}?${new URLSearchParams(params)}`;
