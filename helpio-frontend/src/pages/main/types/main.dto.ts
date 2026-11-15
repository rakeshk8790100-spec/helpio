import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { AuthUser } from '@/common/CommonDto';

/* The app shell (header, page, bottom tabs) for customers, providers and visitors. */

export interface MainTab {
  label: string;
  path: string;
  Icon: LucideIcon;
  active: boolean;
  onSelect: () => void;
}

export interface MainLayoutProps {
  onHome: () => void;
  /** Signed in: the bell and the account menu; otherwise the "Log in" button (hidden on auth screens) */
  user: AuthUser | null;
  bell: ReactNode;
  onLogout: () => void;
  onLogin: (() => void) | null;
  /** Popups opened over any page: log-in, favourite services */
  overlays: ReactNode;
  /** The current page */
  content: ReactNode;
  /** Hidden on log-in, sign-up and password pages, so the form has the screen */
  tabs: MainTab[] | null;
}
