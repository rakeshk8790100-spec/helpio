import { useState } from 'react';
import type { ComponentProps } from 'react';
import { App } from 'antd';
import { OTP_LENGTH } from '../common/CommonEnum';
import type { OtpPurpose } from '../common/CommonEnum';
import type { OtpVerify } from '../component/marketplace';
import { apiErrorMessage } from '../lib/apiError';
import { useCountdown } from './useCountdown';
import { useResendOtpMutation, useVerifyOtpMutation } from '../pages/auth/auth.api';

/** Matches the backend's minimum gap between two codes */
const RESEND_COOLDOWN_SECONDS = 60;

interface OtpTarget {
  email: string;
  purpose: OtpPurpose;
}

/**
 * The "enter the emailed code" step shared by login and provider sign-up.
 * A correct code stores the session (auth.api), and the page then redirects.
 */
export const useOtpStep = () => {
  const { message } = App.useApp();
  const [target, setTarget] = useState<OtpTarget | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const { secondsLeft, start } = useCountdown();
  const [verifyOtp, { isLoading: verifying }] = useVerifyOtpMutation();
  const [resendOtp, { isLoading: resending }] = useResendOtpMutation();

  const verify = async (otp: string) => {
    if (!target || otp.length !== OTP_LENGTH) return;
    setError(undefined);
    try {
      await verifyOtp({ ...target, otp }).unwrap();
    } catch (e) {
      setError(apiErrorMessage(e));
      setCode('');
    }
  };

  const props: ComponentProps<typeof OtpVerify> | null = target && {
    email: target.email,
    value: code,
    onChange: (value) => {
      setCode(value);
      if (value.length === OTP_LENGTH) void verify(value);
    },
    onSubmit: () => void verify(code),
    verifying,
    error,
    resendIn: secondsLeft,
    resending,
    onResend: async () => {
      setError(undefined);
      try {
        await resendOtp(target).unwrap();
        setCode('');
        start(RESEND_COOLDOWN_SECONDS);
        message.success('We sent a new code');
      } catch (e) {
        setError(apiErrorMessage(e));
      }
    },
    onChangeEmail: () => setTarget(null),
  };

  return {
    /** Show the code step for an email that was just sent a code */
    open: (next: OtpTarget) => {
      setTarget(next);
      setCode('');
      setError(undefined);
      start(RESEND_COOLDOWN_SECONDS);
    },
    /** Props for `OtpVerify`, or null while the code step isn't shown */
    props,
  };
};
