
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
  /** Customer jobs: post, list, one job's hub (quotes, PIN, progress, payment) and masked chat */
  POST_JOB: '/jobs/new',
  JOBS: '/jobs',
  JOB_DETAIL: '/jobs/:id',
  JOB_CHAT: '/jobs/:id/chat',
  /** Provider area after sign-up */
  PRO_VERIFICATION: '/pro/verification',
  PRO_JOBS: '/pro/jobs',
  PRO_JOB_DETAIL: '/pro/jobs/:id',
  PRO_JOB_CHAT: '/pro/jobs/:id/chat',
  PRO_WORK: '/pro/work/:id',
  PRO_EARNINGS: '/pro/earnings',
  CATEGORY: '/categories/:id',
  /** Admin console (desktop): log-in with an emailed code, access requests, then the console */
  ADMIN: '/admin',
  ADMIN_LOGIN: '/admin/login',
  ADMIN_REQUEST_ACCESS: '/admin/request-access',
  ADMIN_APPROVALS: '/admin/approvals',
  ADMIN_STATUS: '/admin/status',
  ADMIN_USERS: '/admin/users',
  ADMIN_JOBS: '/admin/jobs',
  ADMIN_PAYMENTS: '/admin/payments',
  ADMIN_REVIEWS: '/admin/reviews',
  ADMIN_CATALOG: '/admin/catalog',
  ADMIN_SETTINGS: '/admin/settings',
  ADMIN_ADMINS: '/admin/admins',
  ADMIN_AUDIT: '/admin/audit',
} as const;

/** Fill `:param` segments, e.g. toPath(RouterKeys.JOB_DETAIL, { id: 'j1' }). */
export const toPath = (path: string, params: Record<string, string> = {}) =>
  path.replace(/:(\w+)/g, (_, key: string) => params[key] ?? key);

/** Append query params, e.g. withQuery(RouterKeys.POST_JOB, { emergency: '1' }). */
export const withQuery = (path: string, params: Record<string, string>) =>
  `${path}?${new URLSearchParams(params)}`;
