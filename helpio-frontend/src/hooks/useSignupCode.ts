import { App, Form } from 'antd';
import { useState } from 'react';
import type { SelfServiceRole } from '@/common/CommonEnum';
import { apiErrorMessage } from '@/lib/apiError';
import { useRegisterMutation, useVerifySignupMutation } from '@/pages/auth/auth.api';
import type { EmailCodeFormValues, EmailCodeStepProps } from '@/pages/auth/types/auth.dto';
import type { RegisterDto } from '@/pages/auth/types/auth.dto';
import { useCountdown } from './useCountdown';

type SignupDetails = Omit<RegisterDto, 'role'>;

/**
 * Sign-up for both audiences: `send` emails a code for the details, then `step` asks for it. The right code
 * creates the account and starts the session, so the sign-up page redirects on its own.
 */
export const useSignupCode = (role: SelfServiceRole) => {
  const { message } = App.useApp();
  const [codeForm] = Form.useForm<EmailCodeFormValues>();
  // Set once a code was sent; kept so Resend can send the same details again
  const [sent, setSent] = useState<SignupDetails | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const { secondsLeft, start } = useCountdown();
  const [register, { isLoading: sending }] = useRegisterMutation();
  const [verify, { isLoading: verifying }] = useVerifySignupMutation();

  /** True once the code is on its way */
  const send = async (details: SignupDetails) => {
    setError(undefined);
    try {
      const result = await register({ ...details, role }).unwrap();
      setSent({ ...details, email: result.email });
      start(result.resendIn);
      return true;
    } catch (e) {
      setError(apiErrorMessage(e));
      return false;
    }
  };

  const step: EmailCodeStepProps | null = sent && {
    email: sent.email,
    form: codeForm,
    submitting: verifying,
    onSubmit: async ({ otp }) => {
      setError(undefined);
      try {
        const result = await verify({ email: sent.email, otp }).unwrap();
        // A customer waiting for an admin: no session yet, the page says so
        if ('pendingApproval' in result) setPendingEmail(result.email);
      } catch (e) {
        setError(apiErrorMessage(e));
        codeForm.setFieldValue('otp', '');
      }
    },
    resendIn: secondsLeft,
    resending: sending,
    onResend: async () => {
      if (await send(sent)) message.success('We sent a new code');
    },
    onChangeEmail: () => {
      setError(undefined);
      setSent(null);
    },
  };

  return { send, sending: sending && !sent, error, step: pendingEmail ? null : step, pending: pendingEmail };
};
