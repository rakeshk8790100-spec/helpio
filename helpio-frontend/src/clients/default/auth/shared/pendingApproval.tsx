import { Button } from 'antd';
import { Hourglass } from 'lucide-react';

/** Sign-up done, but an admin approves new accounts first: no session until they do. */
const PendingApproval = ({ email, onHome }: { email: string; onHome: () => void }) => (
  <div className="flex flex-col items-start gap-4">
    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
      <Hourglass size={22} />
    </span>
    <div role="status">
      <div className="text-xl font-bold text-slate-900">Thanks! Your account is waiting for approval</div>
      <div className="mt-1 text-sm text-slate-600">
        Helpio checks every new account. We'll email <span className="font-medium text-slate-900">{email}</span> as soon as
        yours is approved, then you can log in with your email and password.
      </div>
    </div>
    <Button size="large" block onClick={onHome}>
      Back to Helpio
    </Button>
  </div>
);

export default PendingApproval;
