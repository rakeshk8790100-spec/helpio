import { LogOut, Monitor } from 'lucide-react';
import { HelpioLogo } from '@/components/common';
import { Avatar } from '@/components/ui';
import type { AdminShellLayoutProps } from '@/pages/admin/types/adminShell.dto';

/** Desktop shell of the admin console: sidebar (sections, environment, the signed-in admin) and the page. */
const AdminShellLayout = (p: AdminShellLayoutProps) =>
  !p.wide ? (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 p-6 text-center">
      <Monitor size={32} className="text-indigo-500" />
      <div className="text-base font-semibold text-slate-900">Open the admin console on a computer</div>
      <div className="max-w-xs text-sm text-slate-500">It's built for a wide screen. Helpio's app works on phones.</div>
    </div>
  ) : (
    <div className="flex min-h-screen bg-slate-50">
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
              p.environment === 'development' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
            }`}
          >
            {p.environment === 'development' ? 'Development' : 'Live'}
          </span>
        </div>
        <nav aria-label="Admin sections" className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3">
          {p.nav.map(({ to, label, Icon, active, count, onSelect }) => (
            <a
              key={to}
              href={to}
              aria-current={active ? 'page' : undefined}
              onClick={(e) => {
                e.preventDefault();
                onSelect();
              }}
              className={`flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${
                active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon size={18} />
              <span className="flex-1">{label}</span>
              {count > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">{count}</span>
              )}
            </a>
          ))}
        </nav>
        {p.admin && (
          <div className="flex items-center gap-3 border-t border-slate-100 p-4">
            <Avatar name={p.admin.name} src={p.admin.avatarUrl} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-slate-900">{p.admin.name}</div>
              <div className="truncate text-[11px] text-slate-500">{p.admin.roleLabel}</div>
            </div>
            <button
              type="button"
              onClick={p.onLogout}
              disabled={p.loggingOut}
              aria-label="Log out"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </aside>
      <main className="min-w-0 flex-1 px-8 py-6">
        <div className="mx-auto w-full max-w-[1440px]">{p.content}</div>
      </main>
    </div>
  );

export default AdminShellLayout;
