import { Alert, Button, Form } from 'antd';
import { MailCheck } from 'lucide-react';
import { OTP_LENGTH } from '../../../common/CommonEnum';
import { OtpField } from './authFields';
import type { EmailCodeStepProps } from './emailCodeStep.types';

/** Sign-up, after the details: enter the code emailed to prove the address (also the admin console's log-in code). */
const EmailCodeStep = ({
  error,
  title = 'Verify your email',
  submitLabel = 'Verify & continue',
  ...p
}: EmailCodeStepProps & { error?: string; title?: string; submitLabel?: string }) => (
  <div className="flex flex-col gap-6">
    <div className="flex flex-col items-start gap-3">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
        <MailCheck size={22} />
      </span>
      <div>
        <div className="text-xl font-bold text-slate-900">{title}</div>
        <div className="mt-1 text-sm text-slate-600">
          We sent a {OTP_LENGTH}-digit code to <span className="font-medium text-slate-900">{p.email}</span>.{' '}
          <button type="button" onClick={p.onChangeEmail} className="font-medium text-indigo-600">
            Change
          </button>
        </div>
      </div>
    </div>

    {error && <Alert type="error" showIcon title={error} />}

    <section className="rounded-2xl border border-slate-100 p-5 shadow-sm">
      <Form form={p.form} layout="vertical" requiredMark={false} preserve={false} onFinish={p.onSubmit}>
        <OtpField />
        <Button type="primary" htmlType="submit" size="large" block loading={p.submitting}>
          {submitLabel}
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
    </section>
  </div>
);

export default EmailCodeStep;
