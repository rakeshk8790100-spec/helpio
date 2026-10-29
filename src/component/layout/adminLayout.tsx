import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Activity,
  BriefcaseBusiness,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Monitor,
  PlugZap,
  ScrollText,
  ShieldCheck,
  Star,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useGetMeQuery, useLogoutMutation } from '../../common/CommonApi';
import type { ApprovalCounts } from '../../common/CommonDto';
import { useGetApprovalCountsQuery } from '../../pages/admin/admin.api';
import { envConfig } from '../../config/env.config';
import { RouterKeys } from '../../config/router/RouterKeys';
import { useAppSelector } from '../../redux';
import { selectCurrentUser } from '../../redux/authSlice';
import { HelpioLogo } from '../marketplace';
import { Avatar } from '../ui';

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

/** Desktop shell of the admin console: sidebar (sections, environment, the signed-in admin) and the page. */
const AdminLayout = () => {
  const user = useAppSelector(selectCurrentUser);
  const navigate = useNavigate();
  const [logout, { isLoading: loggingOut }] = useLogoutMutation();
  // Refresh the stored admin (owner flag, still active) once per visit
  useGetMeQuery();
  const { data: counts } = useGetApprovalCountsQuery(undefined, { pollingInterval: COUNTS_POLL_MS });

  const onLogout = async () => {
    await logout();
    navigate(RouterKeys.ADMIN_LOGIN);
  };
  const items = NAV.filter((item) => !item.ownerOnly || user?.isOwner);

  return (
    <>
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 p-6 text-center lg:hidden">
        <Monitor size={32} className="text-indigo-500" />
        <div className="text-base font-semibold text-slate-900">Open the admin console on a computer</div>
        <div className="max-w-xs text-sm text-slate-500">It's built for a wide screen. Helpio's app works on phones.</div>
      </div>

      <div className="hidden min-h-screen bg-slate-50 lg:flex">
        <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
          <div className="flex h-16 items-center gap-2 px-5">
            <HelpioLogo size="sm" />
            <span className="rounded-md bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
              Admin
            </span>
          </div>
          <div className="px-5 pb-3">
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                envConfig.isDev ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              {envConfig.isDev ? 'Development' : 'Live'}
            </span>
          </div>
          <nav aria-label="Admin sections" className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3">
            {items.map(({ to, label, Icon, badge }) => (
              <NavLink
                key={to}
                to={to}
                // The dashboard is /admin itself: active only there, not under every console page
                end={to === RouterKeys.ADMIN}
                className={({ isActive }) =>
                  `flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${
                    isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                <Icon size={18} />
                <span className="flex-1">{label}</span>
                {counts && badge && badge(counts) > 0 && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                    {badge(counts)}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
          {user && (
            <div className="flex items-center gap-3 border-t border-slate-100 p-4">
              <Avatar name={user.name ?? user.email} src={user.avatarUrl} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-slate-900">{user.name ?? user.email}</div>
                <div className="truncate text-[11px] text-slate-500">{user.isOwner ? 'Owner' : 'Admin'}</div>
              </div>
              <button
                type="button"
                onClick={onLogout}
                disabled={loggingOut}
                aria-label="Log out"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </aside>
        <main className="min-w-0 flex-1 px-8 py-6">
          <div className="mx-auto w-full max-w-[1440px]">
            <Outlet />
          </div>
        </main>
      </div>
    </>
  );
};

export default AdminLayout;
