import { Alert, Button, Form } from 'antd';
import { EmailField, NameField, PasswordField, PhoneField } from '@/clients/default/auth/shared/authFields';
import AuthHeader from '@/clients/default/auth/shared/authHeader';
import EmailCodeStep from '@/clients/default/auth/shared/emailCodeStep';
import GoogleSignIn from '@/clients/default/auth/shared/googleSignIn';
import PendingApproval from '@/clients/default/auth/shared/pendingApproval';
import type { SignupLayoutProps } from '@/pages/auth/types/auth.dto';

/** /signup: customer name, email, mobile and password (Google below the form), then the emailed code. */
const SignupLayout = (p: SignupLayoutProps) => (
  <div className="flex flex-col gap-6">
    {p.pending ? (
      <PendingApproval {...p.pending} />
    ) : p.code ? (
      <EmailCodeStep {...p.code} error={p.error} />
    ) : (
      <>
        <AuthHeader title="Create your account" subtitle="Book trusted help near you in minutes." />

        {p.error && <Alert type="error" showIcon title={p.error} />}

        <section className="rounded-2xl border border-slate-100 p-5 shadow-sm">
          <Form form={p.form} layout="vertical" requiredMark={false} validateTrigger="onBlur" onFinish={p.onSubmit}>
            <NameField />
            <EmailField />
            <PhoneField />
            <PasswordField />
            <Button type="primary" htmlType="submit" size="large" block loading={p.submitting}>
              Create account
            </Button>
          </Form>
          {p.google && <GoogleSignIn google={p.google} />}
        </section>
      </>
    )}

    <div className="flex flex-col items-center text-sm text-slate-600">
      <div>
        Already have an account?{' '}
        <Button type="link" onClick={p.onLogin} className="!px-0 !font-semibold">
          Log in
        </Button>
      </div>
      <div>
        Are you a professional?{' '}
        <Button type="link" onClick={p.onSwitchAudience} className="!px-0 !font-semibold">
          Join as a pro
        </Button>
      </div>
    </div>

    <div className="text-center text-[11px] text-slate-500">
      By continuing you agree to Helpio's Terms of Service and Privacy Policy.
    </div>
  </div>
);

export default SignupLayout;
