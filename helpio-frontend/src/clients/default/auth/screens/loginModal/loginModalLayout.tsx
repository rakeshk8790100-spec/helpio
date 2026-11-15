import { Button, Modal } from 'antd';
import { ArrowLeft, Briefcase, ChevronRight, Home } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import LoginLayout from '@/clients/default/auth/screens/login/loginLayout';
import AuthHeader from '@/clients/default/auth/shared/authHeader';
import { UserRole } from '@/common/CommonEnum';
import type { SelfServiceRole } from '@/common/CommonEnum';
import type { LoginModalLayoutProps } from '@/pages/auth/types/auth.dto';

const CHOICES: { role: SelfServiceRole; Icon: LucideIcon; title: string; text: string; iconTone: string }[] = [
  { role: UserRole.CUSTOMER, Icon: Home, title: 'I need help at home', text: 'Log in as a customer', iconTone: 'bg-indigo-50 text-indigo-600' },
  { role: UserRole.PROVIDER, Icon: Briefcase, title: "I'm a professional", text: 'Log in to find jobs and earn', iconTone: 'bg-amber-50 text-amber-600' },
];

/** Header "Log in" popup: pick customer or professional, then log in without leaving the page. */
const LoginModalLayout = (p: LoginModalLayoutProps) => (
  <Modal open footer={null} centered width={400} onCancel={p.onClose} title={null}>
    {p.role ? (
      <div className="flex flex-col gap-3">
        <Button type="text" icon={<ArrowLeft size={16} />} onClick={p.onBack} className="!-ml-2 !self-start !text-slate-600">
          Back
        </Button>
        <LoginLayout key={p.role} {...p.login} />
      </div>
    ) : (
      <div className="flex flex-col gap-5">
        <AuthHeader title="Log in to Helpio" subtitle="Choose how you use Helpio." />

        <div className="flex flex-col gap-3">
          {CHOICES.map(({ role, Icon, title, text, iconTone }) => (
            <button
              key={role}
              type="button"
              onClick={() => p.onChoose(role)}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left active:scale-[.98]"
            >
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconTone}`}>
                <Icon size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-slate-900">{title}</span>
                <span className="block text-xs text-slate-500">{text}</span>
              </span>
              <ChevronRight size={18} className="shrink-0 text-slate-400" />
            </button>
          ))}
        </div>

        <div className="flex flex-col items-center text-sm text-slate-600">
          <div>New to Helpio?</div>
          <div>
            <Button type="link" onClick={() => p.onSignup(UserRole.CUSTOMER)} className="!px-1 !font-semibold">
              Sign up as customer
            </Button>
            <span aria-hidden>·</span>
            <Button type="link" onClick={() => p.onSignup(UserRole.PROVIDER)} className="!px-1 !font-semibold">
              Join as a pro
            </Button>
          </div>
        </div>
      </div>
    )}
  </Modal>
);

export default LoginModalLayout;
