import { Alert, Button, Form } from 'antd';
import { MailCheck } from 'lucide-react';
import { EmailField, OtpField, PasswordField } from '@/clients/default/auth/shared/authFields';
import AuthHeader from '@/clients/default/auth/shared/authHeader';
import { OTP_LENGTH, UserRole } from '@/common/CommonEnum';
import type { ForgotPasswordLayoutProps } from '@/pages/auth/types/auth.dto';
import { ResetStep } from '@/pages/auth/types/auth.enum';

/** /forgot-password and /pro/forgot-password: email, then the emailed code and a new password. */
const ForgotPasswordLayout = (p: ForgotPasswordLayoutProps) => (
  <div className="flex flex-col gap-6">
    {p.step === ResetStep.EMAIL ? (
      <AuthHeader
        forProfessionals={p.audience === UserRole.PROVIDER}
        title="Reset your password"
        subtitle={`Enter your account email and we'll send you a ${OTP_LENGTH}-digit code.`}
      />
    ) : (
      <div className="flex flex-col items-start gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
          <MailCheck size={22} />
        </span>
        <div>
          <div className="text-2xl font-bold text-slate-900">Check your email</div>
          <div className="mt-1 text-sm text-slate-600">
            If <span className="font-medium text-slate-900">{p.email}</span> has a Helpio account, we've sent it a{' '}
            {OTP_LENGTH}-digit code.{' '}
            <button type="button" onClick={p.onChangeEmail} className="font-medium text-indigo-600">
              Change
            </button>
          </div>
        </div>
      </div>
    )}

    {p.error && <Alert type="error" showIcon title={p.error} />}

    <section className="rounded-2xl border border-slate-100 p-5 shadow-sm">
      {p.step === ResetStep.EMAIL ? (
        <Form
          form={p.emailForm.form}
          layout="vertical"
          requiredMark={false}
          validateTrigger="onBlur"
          initialValues={p.emailForm.initialValues}
          onFinish={p.emailForm.onSubmit}
        >
          <EmailField />
          <Button type="primary" htmlType="submit" size="large" block loading={p.emailForm.submitting}>
            Send code
          </Button>
        </Form>
      ) : (
        <Form
          form={p.resetForm.form}
          layout="vertical"
          requiredMark={false}
          validateTrigger="onBlur"
          preserve={false}
          onFinish={p.resetForm.onSubmit}
        >
          <OtpField />
          <PasswordField label="New password" />
          <Button type="primary" htmlType="submit" size="large" block loading={p.resetForm.submitting}>
            Reset password
          </Button>
          <div className="mt-4 text-center text-sm text-slate-600">
            Didn't get it? Check spam, or{' '}
            {p.resendIn > 0 ? (
              <span className="text-slate-500">resend in {p.resendIn}s</span>
            ) : (
              <Button type="link" onClick={p.onResend} loading={p.resending} className="!h-auto !p-0 !font-semibold">
                resend the code
              </Button>
            )}
          </div>
        </Form>
      )}
    </section>

    <div className="text-center text-sm text-slate-600">
      Remembered it?{' '}
      <Button type="link" onClick={p.onBackToLogin} className="!px-0 !font-semibold">
        Back to log in
      </Button>
    </div>
  </div>
);

export default ForgotPasswordLayout;
