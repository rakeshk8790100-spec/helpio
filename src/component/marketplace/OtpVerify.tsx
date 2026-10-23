import { Alert, Button, Input } from 'antd';
import { MailCheck } from 'lucide-react';
import { OTP_LENGTH } from '../../common/CommonEnum';

interface Props {
  email: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  verifying: boolean;
  error?: string;
  /** Seconds until another code can be requested; 0 when allowed */
  resendIn: number;
  resending: boolean;
  onResend: () => void;
  onChangeEmail: () => void;
}

/** Enter the 6-digit code emailed to the user, with resend and change-email actions. */
const OtpVerify = ({
  email, value, onChange, onSubmit, verifying, error, resendIn, resending, onResend, onChangeEmail,
}: Props) => (
  <form
    className="flex flex-col gap-5"
    onSubmit={(event) => {
      event.preventDefault();
      onSubmit();
    }}
  >
    <div className="flex flex-col items-start gap-3">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
        <MailCheck size={22} />
      </span>
      <div>
        <div className="text-lg font-semibold text-slate-900">Check your email</div>
        <div className="mt-1 text-sm text-slate-600">
          We sent a {OTP_LENGTH}-digit code to <span className="font-medium text-slate-900">{email}</span>.{' '}
          <button type="button" onClick={onChangeEmail} className="font-medium text-indigo-600">
            Change
          </button>
        </div>
      </div>
    </div>

    {error && <Alert type="error" showIcon title={error} />}

    <Input.OTP
      length={OTP_LENGTH}
      size="large"
      value={value}
      onChange={onChange}
      formatter={(text) => text.replace(/\D/g, '')}
      autoComplete="one-time-code"
      inputMode="numeric"
      aria-label={`${OTP_LENGTH}-digit code`}
      status={error ? 'error' : undefined}
      disabled={verifying}
      className="!w-full !justify-between"
    />

    <Button type="primary" htmlType="submit" size="large" block loading={verifying} disabled={value.length !== OTP_LENGTH}>
      Verify and continue
    </Button>

    <div className="text-center text-sm text-slate-600">
      Didn't get it? Check spam, or{' '}
      {resendIn > 0 ? (
        <span className="text-slate-500">resend in {resendIn}s</span>
      ) : (
        <Button type="link" onClick={onResend} loading={resending} className="!h-auto !p-0 !font-semibold">
          resend the code
        </Button>
      )}
    </div>
  </form>
);

export default OtpVerify;
