import { App, Form } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminRequestAccessLayout } from '@/clients';
import { ApprovalStatus } from '@/common/CommonEnum';
import SuspenseWrapper from '@/components/wrapper/SuspenseWrapper';
import { RouterKeys } from '@/config/router/RouterKeys';
import { useCountdown } from '@/hooks/useCountdown';
import { apiErrorMessage } from '@/lib/apiError';
import type { EmailCodeFormValues } from '@/pages/auth/types/auth.dto';
import { useRequestAdminAccessMutation, useVerifyAdminAccessMutation } from './adminRequestAccess.api';
import type { AccessRequestFormValues, AdminRequestAccessLayoutProps } from './types/adminRequestAccess.dto';

/** /admin/request-access: details, the emailed code, then the request waits for the owner. */
const useAdminRequestAccess = (): AdminRequestAccessLayoutProps => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [form] = Form.useForm<AccessRequestFormValues>();
  const [codeForm] = Form.useForm<EmailCodeFormValues>();
  const [sent, setSent] = useState<AccessRequestFormValues | null>(null);
  const [result, setResult] = useState<{ email: string; approved: boolean } | null>(null);
  const [error, setError] = useState<string>();
  const { secondsLeft, start } = useCountdown();
  const [requestAccess, { isLoading: sending }] = useRequestAdminAccessMutation();
  const [verify, { isLoading: verifying }] = useVerifyAdminAccessMutation();

  const send = async (values: AccessRequestFormValues) => {
    setError(undefined);
    try {
      const sentTo = await requestAccess(values).unwrap();
      setSent({ ...values, email: sentTo.email });
      start(sentTo.resendIn);
      return true;
    } catch (e) {
      setError(apiErrorMessage(e));
      return false;
    }
  };

  return {
    form,
    sending,
    error,
    onSubmit: send,
    code: sent && !result
      ? {
          email: sent.email,
          form: codeForm,
          submitting: verifying,
          onSubmit: async ({ otp }) => {
            setError(undefined);
            try {
              const answer = await verify({ email: sent.email, otp }).unwrap();
              setResult({ email: answer.email, approved: answer.approvalStatus === ApprovalStatus.APPROVED });
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
        }
      : null,
    result,
    onLogin: () => navigate(RouterKeys.ADMIN_LOGIN),
  };
};

/** /admin/request-access */
const AdminRequestAccessPage = () => <SuspenseWrapper><AdminRequestAccessLayout {...useAdminRequestAccess()} /></SuspenseWrapper>;

export default AdminRequestAccessPage;
