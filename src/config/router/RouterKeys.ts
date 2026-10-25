export const RouterKeys = {
  HOME: '/',
  SEARCH: '/search',
  PROFILE: '/profile',
  /** Provider: change skills, or service area and hours, after sign-up */
  PROFILE_SKILLS: '/profile/skills',
  PROFILE_AREA: '/profile/service-area',
  /** A pro's public profile */
  PRO_PROFILE: '/pros/:id',
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
  /** Customer jobs: post, list, one job's hub (quotes, escrow, PIN, progress) and masked chat */
  POST_JOB: '/jobs/new',
  JOBS: '/jobs',
  JOB_DETAIL: '/jobs/:id',
  JOB_CHAT: '/jobs/:id/chat',
  /** Provider area after sign-up */
  PRO_VERIFICATION: '/pro/verification',
  PRO_JOBS: '/pro/jobs',
  PRO_JOB_DETAIL: '/pro/jobs/:id',
  PRO_WORK: '/pro/work/:id',
  PRO_EARNINGS: '/pro/earnings',
  SERVICE_DETAIL: '/services/:id',
  CATEGORY: '/categories/:id',
} as const;

/** Fill `:param` segments, e.g. toPath(RouterKeys.SERVICE_DETAIL, { id: 's1' }). */
export const toPath = (path: string, params: Record<string, string> = {}) =>
  path.replace(/:(\w+)/g, (_, key: string) => params[key] ?? key);

/** Append query params, e.g. withQuery(RouterKeys.POST_JOB, { emergency: '1' }). */
export const withQuery = (path: string, params: Record<string, string>) =>
  `${path}?${new URLSearchParams(params)}`;
