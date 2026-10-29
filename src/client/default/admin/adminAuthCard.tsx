import type { ReactNode } from 'react';
import { HelpioLogo } from '../../../component/marketplace';

/** The admin log-in and access pages: a centred card on a quiet background, outside the console shell. */
const AdminAuthCard = ({ children }: { children: ReactNode }) => (
  <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
    <div className="w-full max-w-md">
      <div className="mb-6 flex items-center justify-center gap-2">
        <HelpioLogo size="md" />
        <span className="rounded-md bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
          Admin
        </span>
      </div>
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">{children}</div>
    </div>
  </div>
);

export default AdminAuthCard;
