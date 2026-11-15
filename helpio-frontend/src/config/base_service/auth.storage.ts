import type { AuthSession, AuthUser } from '@/common/CommonDto';

const KEYS = {
  TOKEN: 'access_token',
  USER: 'auth_user',
} as const;

/**
 * The signed-in session in localStorage, so a reload keeps the user signed in.
 * Storage can be unavailable (private mode, blocked site data), so every access is guarded.
 */
export const authStorage = {
  load: (): AuthSession | null => {
    try {
      const token = localStorage.getItem(KEYS.TOKEN);
      const user = localStorage.getItem(KEYS.USER);
      return token && user ? { token, user: JSON.parse(user) as AuthUser } : null;
    } catch {
      return null;
    }
  },
  save: (session: AuthSession): void => {
    try {
      localStorage.setItem(KEYS.TOKEN, session.token);
      localStorage.setItem(KEYS.USER, JSON.stringify(session.user));
    } catch {
      // Not persisted; the session still works until the tab closes.
    }
  },
  clear: (): void => {
    try {
      localStorage.removeItem(KEYS.TOKEN);
      localStorage.removeItem(KEYS.USER);
    } catch {
      // Nothing stored.
    }
  },
};
