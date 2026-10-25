import type { AuthUser } from '../../common/CommonDto';
import { OnboardingStatus, UserRole } from '../../common/CommonEnum';
import { RouterKeys, withQuery } from '../../config/router/RouterKeys';

/* Where a signed-in user belongs. The backend owns role and onboarding status; these only route on them. */

const ONBOARDING_ORDER: string[] = [RouterKeys.ONBOARDING_SKILLS, RouterKeys.ONBOARDING_AREA];

const STEP_PATH: Record<string, string> = {
  [OnboardingStatus.SKILLS]: RouterKeys.ONBOARDING_SKILLS,
  [OnboardingStatus.SERVICE_SETUP]: RouterKeys.ONBOARDING_AREA,
};

/** The provider sign-up step still to do, if any. */
export const pendingOnboardingPath = (user: AuthUser): string | null =>
  user.role === UserRole.PROVIDER && user.onboardingStatus ? STEP_PATH[user.onboardingStatus] ?? null : null;

/** Customers need a name and mobile number (Google sign-in may not provide them). */
export const needsProfile = (user: AuthUser) => user.role === UserRole.CUSTOMER && (!user.name || !user.phone);

/** Where to land right after signing in. */
export const homePath = (user: AuthUser) => pendingOnboardingPath(user) ?? RouterKeys.HOME;

/** Signed-out visitors log in on the page for the audience a route is meant for. */
export const loginPathFor = (roles?: UserRole[]) =>
  roles?.length === 1 && roles[0] === UserRole.PROVIDER ? RouterKeys.PRO_LOGIN : RouterKeys.LOGIN;

/** Only same-app paths are accepted as a post-login target (prevents open redirects). */
export const safeNext = (next: string | null) => (next && next.startsWith('/') && !next.startsWith('//') ? next : null);

/**
 * Unfinished sign-up comes first: returns where to send the user instead of `pathname`, or null if allowed.
 * Providers may revisit earlier onboarding steps but not skip ahead.
 */
export const signUpRedirect = (user: AuthUser, pathname: string): string | null => {
  if (needsProfile(user)) return withQuery(RouterKeys.LOGIN, { next: pathname });
  const pending = pendingOnboardingPath(user);
  if (!pending) return null;
  const reachable = ONBOARDING_ORDER.slice(0, ONBOARDING_ORDER.indexOf(pending) + 1);
  return reachable.includes(pathname) ? null : pending;
};
