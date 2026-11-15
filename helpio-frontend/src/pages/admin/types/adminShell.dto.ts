import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/* The admin console's shell: sidebar sections, environment, the signed-in admin, and the page. */

export interface AdminNavItem {
  to: string;
  label: string;
  Icon: LucideIcon;
  active: boolean;
  /** Waiting items, e.g. sign-ups to approve; 0 hides it */
  count: number;
  onSelect: () => void;
}

export interface AdminShellLayoutProps {
  /** The console is built for a computer; phones see a note instead (and no page is loaded) */
  wide: boolean;
  environment: 'development' | 'live';
  nav: AdminNavItem[];
  admin: { name: string; avatarUrl: string | null; roleLabel: string } | null;
  onLogout: () => void;
  loggingOut: boolean;
  content: ReactNode;
}
