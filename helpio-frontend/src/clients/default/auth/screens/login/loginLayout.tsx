import { Alert, Button, Form } from 'antd';
import { EmailField, PasswordField } from '@/clients/default/auth/shared/authFields';
import AuthHeader from '@/clients/default/auth/shared/authHeader';
import GoogleSignIn from '@/clients/default/auth/shared/googleSignIn';
import { UserRole } from '@/common/CommonEnum';
import type { LoginLayoutProps } from '@/pages/auth/types/auth.dto';

const COPY = {
  [UserRole.CUSTOMER]: {
    title: 'Welcome back',
    subtitle: 'Log in to book trusted help near you.',
    signupAction: 'Create an account',
    switchPrompt: 'Are you a professional?',
    switchAction: 'Log in here',
  },
  [UserRole.PROVIDER]: {
    title: 'Log in as a pro',
    subtitle: 'Pick up nearby jobs and keep track of your earnings.',
    signupAction: 'Join as a pro',
    switchPrompt: 'Need help at home?',
    switchAction: 'Customer log-in',
  },
};

/** /login and /pro/login: email + password; customers can also continue with Google below the form. */
const LoginLayout = (p: LoginLayoutProps) => {
  const copy = COPY[p.audience];
  const isCustomer = p.audience === UserRole.CUSTOMER;

  return (
    <div className="flex flex-col gap-6">
      <AuthHeader
        title={copy.title}
        subtitle={p.continuing ? 'Log in or create an account to continue.' : copy.subtitle}
        forProfessionals={!isCustomer}
      />

      {p.error && <Alert type="error" showIcon title={p.error} />}

      <section className="rounded-2xl border border-slate-100 p-5 shadow-sm">
        <Form
          form={p.form}
          layout="vertical"
          requiredMark={false}
          validateTrigger="onBlur"
          initialValues={p.initialValues}
          onFinish={p.onSubmit}
        >
          <EmailField />
          <PasswordField autoComplete="current-password" />
          <div className="-mt-3 mb-4 flex justify-end">
            <Button type="link" onClick={p.onForgotPassword} className="!h-auto !p-0 !font-medium">
              Forgot password?
            </Button>
          </div>
          <Button type="primary" htmlType="submit" size="large" block loading={p.submitting}>
            Log in
          </Button>
        </Form>
        {p.google && <GoogleSignIn google={p.google} />}
      </section>

      <div className="flex flex-col items-center text-sm text-slate-600">
        <div>
          New to Helpio?{' '}
          <Button type="link" onClick={p.onSignup} className="!px-0 !font-semibold">
            {copy.signupAction}
          </Button>
        </div>
        <div>
          {copy.switchPrompt}{' '}
          <Button type="link" onClick={p.onSwitchAudience} className="!px-0 !font-semibold">
            {copy.switchAction}
          </Button>
        </div>
      </div>

      {isCustomer && (
        <div className="text-center text-[11px] text-slate-500">
          By continuing you agree to Helpio's Terms of Service and Privacy Policy.
        </div>
      )}
    </div>
  );
};

export default LoginLayout;
