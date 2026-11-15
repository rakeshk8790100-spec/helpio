import { Spin } from 'antd';
import { GoogleButton } from '@/components/ui';
import type { GoogleOption } from '@/pages/auth/types/auth.dto';

/**
 * "or" divider plus Continue with Google, placed under a log-in or sign-up form. Shows a busy overlay while
 * the backend checks the token, and a reminder in development builds when no client ID is configured.
 */
const GoogleSignIn = ({ google }: { google: GoogleOption }) => (
  <>
    <div className="my-4 flex items-center gap-3 text-[11px] text-slate-500">
      <span className="h-px flex-1 bg-slate-200" />
      or
      <span className="h-px flex-1 bg-slate-200" />
    </div>
    {google.configured ? (
      <div className="relative">
        <GoogleButton clientId={google.clientId} onCredential={google.onCredential} />
        {google.loading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-white/80">
            <Spin size="small" />
          </div>
        )}
      </div>
    ) : (
      <div role="note" className="rounded-full border border-dashed border-slate-300 px-4 py-3 text-center text-xs text-slate-500">
        Continue with Google appears here once VITE_GOOGLE_CLIENT_ID is set (shown in development only).
      </div>
    )}
  </>
);

export default GoogleSignIn;
