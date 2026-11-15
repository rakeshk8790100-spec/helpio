import {
  Activity,
  BriefcaseBusiness,
  LayoutDashboard,
  LayoutGrid,
  ScrollText,
  ShieldCheck,
  Star,
  UserCheck,
  Users,
  Wallet,
  PlugZap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useGetMeQuery, useLogoutMutation } from '@/common/CommonApi';
import { poll } from '@/config/base_service/base.api';
import { envConfig } from '@/config/env.config';
import { RouterKeys } from '@/config/router/RouterKeys';
import { useAppSelector } from '@/redux';
import { selectCurrentUser } from '@/redux/authSlice';
import AdminShellLayout from '@client/admin/adminShellLayout';
import { useGetApprovalCountsQuery } from './admin.api';
import type { ApprovalCounts } from './types/admin.models';

interface NavItem {
  to: string;
  label: string;
  Icon: LucideIcon;
  /** Only the owner manages admins and API keys */
  ownerOnly?: boolean;
  /** Waiting items, shown as a count */
  badge?: (counts: ApprovalCounts) => number;
}

const NAV: NavItem[] = [
  { to: RouterKeys.ADMIN, label: 'Dashboard', Icon: LayoutDashboard },
  { to: RouterKeys.ADMIN_APPROVALS, label: 'Approvals', Icon: UserCheck, badge: (c) => c.customers + c.providers },
  { to: RouterKeys.ADMIN_USERS, label: 'Customers & providers', Icon: Users },
  { to: RouterKeys.ADMIN_JOBS, label: 'Jobs', Icon: BriefcaseBusiness },
  { to: RouterKeys.ADMIN_PAYMENTS, label: 'Payments & payouts', Icon: Wallet },
  { to: RouterKeys.ADMIN_REVIEWS, label: 'Reviews', Icon: Star },
  { to: RouterKeys.ADMIN_CATALOG, label: 'Catalog', Icon: LayoutGrid },
  { to: RouterKeys.ADMIN_STATUS, label: 'System status', Icon: Activity },
  { to: RouterKeys.ADMIN_SETTINGS, label: 'Integrations', Icon: PlugZap, ownerOnly: true },
  { to: RouterKeys.ADMIN_ADMINS, label: 'Admins', Icon: ShieldCheck, ownerOnly: true, badge: (c) => c.admins },
  { to: RouterKeys.ADMIN_AUDIT, label: 'Audit log', Icon: ScrollText },
];

// The sidebar's waiting counts refresh this often
const COUNTS_POLL_MS = 60_000;
const WIDE = '(min-width: 1024px)';

/** Whether the screen is wide enough for the console; follows window resizes */
const useWideScreen = () =>
  useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(WIDE);
      query.addEventListener('change', onChange);
      return () => query.removeEventListener('change', onChange);
    },
    () => window.matchMedia(WIDE).matches,
  );

/** The admin console's shell. On a phone only a note shows, so console pages don't load or poll there. */
const AdminPage = () => {
  const user = useAppSelector(selectCurrentUser);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const wide = useWideScreen();
  const [logout, { isLoading: loggingOut }] = useLogoutMutation();
  // Refresh the stored admin (owner flag, still active) once per visit
  useGetMeQuery();
  const { data: counts } = useGetApprovalCountsQuery(undefined, { ...poll(COUNTS_POLL_MS), skip: !wide });

  return (
    <AdminShellLayout
      wide={wide}
      environment={envConfig.isDev ? 'development' : 'live'}
      nav={NAV.filter((item) => !item.ownerOnly || user?.isOwner).map(({ to, label, Icon, badge }) => ({
        to,
        label,
        Icon,
        // The dashboard is /admin itself: active only there, not under every console page
        active: to === RouterKeys.ADMIN ? pathname === to : pathname.startsWith(to),
        count: counts && badge ? badge(counts) : 0,
        onSelect: () => navigate(to),
      }))}
      admin={user && { name: user.name ?? user.email, avatarUrl: user.avatarUrl, roleLabel: user.isOwner ? 'Owner' : 'Admin' }}
      onLogout={async () => {
        await logout();
        void navigate(RouterKeys.ADMIN_LOGIN);
      }}
      loggingOut={loggingOut}
      content={wide ? <Outlet /> : null}
    />
  );
};

export default AdminPage;
