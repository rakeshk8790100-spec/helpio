import { Alert, Button, Form, Segmented, Spin } from 'antd';
import { BriefcaseBusiness, UserRound } from 'lucide-react';
import { OtpVerify } from '../../../component/marketplace';
import { GoogleButton } from '../../../component/ui';
import { EmailField, NameField, PhoneField } from './authFields';
import { LoginStep, LoginTab } from './login.layout.types';
import type { LoginLayoutProps } from './login.layout.types';

const TAB_OPTIONS = [
  { value: LoginTab.CUSTOMER, label: <span className="flex items-center justify-center gap-1.5"><UserRound size={15} />I need help</span> },
  { value: LoginTab.PROVIDER, label: <span className="flex items-center justify-center gap-1.5"><BriefcaseBusiness size={15} />I'm a pro</span> },
];

const ChangeEmail = ({ email, onChange }: { email: string; onChange: () => void }) => (
  <div className="mb-4 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
    <span className="truncate text-slate-700">{email}</span>
    <button type="button" onClick={onChange} className="shrink-0 font-medium text-indigo-600">Change</button>
  </div>
);

/** /login: one page, two audiences. Everyone signs in with an emailed code; customers can also use Google. */
const LoginLayout = (p: LoginLayoutProps) => {
  if (p.otp) {
    return (
      <div className="flex flex-col gap-6">
        <OtpVerify {...p.otp} />
      </div>
    );
  }

  const isCustomer = p.tab === LoginTab.CUSTOMER;
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-2xl font-bold text-slate-900">Welcome to Helpio</div>
        <div className="mt-1 text-sm text-slate-600">Log in or sign up with your email. No password needed.</div>
      </div>

      <Segmented<LoginTab> block size="large" value={p.tab} onChange={p.onTabChange} options={TAB_OPTIONS} />

      {p.error && <Alert type="error" showIcon title={p.error} />}

      <section className="rounded-2xl border border-slate-100 p-5 shadow-sm">
        {p.step === LoginStep.EMAIL && (
          <>
            <div className="mb-4 text-base font-semibold text-slate-900">
              {isCustomer ? 'Continue as a customer' : 'Log in as a professional'}
            </div>
            {isCustomer && p.google && (
              <>
                <div className="relative">
                  <GoogleButton clientId={p.google.clientId} onCredential={p.google.onCredential} />
                  {p.google.loading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-white/80">
                      <Spin size="small" />
                    </div>
                  )}
                </div>
                <div className="my-4 flex items-center gap-3 text-[11px] text-slate-500">
                  <span className="h-px flex-1 bg-slate-200" />
                  or continue with email
                  <span className="h-px flex-1 bg-slate-200" />
                </div>
              </>
            )}
            <Form
              form={p.emailForm.form}
              layout="vertical"
              requiredMark={false}
              validateTrigger="onBlur"
              onFinish={p.emailForm.onSubmit}
            >
              <EmailField />
              <Button type="primary" htmlType="submit" size="large" block loading={p.emailForm.submitting}>
                Continue
              </Button>
            </Form>
          </>
        )}

        {p.step === LoginStep.DETAILS && (
          <>
            <div className="text-base font-semibold text-slate-900">Create your account</div>
            <div className="mt-1 mb-4 text-sm text-slate-600">New here? Tell us who you are. We'll email you a code.</div>
            <ChangeEmail email={p.email} onChange={p.onChangeEmail} />
            <Form
              form={p.detailsForm.form}
              layout="vertical"
              requiredMark={false}
              validateTrigger="onBlur"
              onFinish={p.detailsForm.onSubmit}
            >
              <NameField />
              <PhoneField />
              <Button type="primary" htmlType="submit" size="large" block loading={p.detailsForm.submitting}>
                Send code
              </Button>
            </Form>
          </>
        )}

        {p.step === LoginStep.NOT_FOUND && (
          <div role="status" className="flex flex-col gap-4">
            <div>
              <div className="text-base font-semibold text-slate-900">No professional account yet</div>
              <div className="mt-1 text-sm text-slate-600">
                We couldn't find a pro account for <span className="font-medium text-slate-900">{p.email}</span>.
                Joining takes about 3 minutes.
              </div>
            </div>
            <Button type="primary" size="large" block onClick={p.onJoinProvider}>
              Join as a pro
            </Button>
            <Button size="large" block onClick={p.onChangeEmail}>
              Use another email
            </Button>
          </div>
        )}
      </section>

      {!isCustomer && p.step === LoginStep.EMAIL && (
        <div className="text-center text-sm text-slate-600">
          New to Helpio?{' '}
          <Button type="link" onClick={p.onJoinProvider} className="!px-0 !font-semibold">
            Join as a pro
          </Button>
        </div>
      )}

      <div className="text-center text-[11px] text-slate-500">
        By continuing you agree to Helpio's Terms of Service and Privacy Policy.
      </div>
    </div>
  );
};

export default LoginLayout;
