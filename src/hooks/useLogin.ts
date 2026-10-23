import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Form } from 'antd';
import { LoginStep, LoginTab } from '../client/default/auth/login.layout.types';
import type {
  DetailsFormValues,
  EmailFormValues,
  LoginLayoutProps,
} from '../client/default/auth/login.layout.types';
import { OtpPurpose } from '../common/CommonEnum';
import { envConfig } from '../config/env.config';
import { RouterKeys, withQuery } from '../config/router/RouterKeys';
import { apiErrorMessage } from '../lib/apiError';
import { useGoogleLoginMutation, useRegisterMutation, useStartOtpMutation } from '../pages/auth/auth.api';
import { useOtpStep } from './useOtpStep';

/** /login behaviour. Once a session exists, LoginPage redirects. */
export const useLogin = (): LoginLayoutProps => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === LoginTab.PROVIDER ? LoginTab.PROVIDER : LoginTab.CUSTOMER;

  const [step, setStep] = useState<LoginStep>(LoginStep.EMAIL);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [emailForm] = Form.useForm<EmailFormValues>();
  const [detailsForm] = Form.useForm<DetailsFormValues>();

  const [startOtp, { isLoading: starting }] = useStartOtpMutation();
  const [register, { isLoading: registering }] = useRegisterMutation();
  const [googleLogin, { isLoading: googleLoading }] = useGoogleLoginMutation();
  const otp = useOtpStep();

  const backToEmail = () => {
    setStep(LoginStep.EMAIL);
    setError(undefined);
  };

  return {
    tab,
    onTabChange: (next) => {
      const updated = new URLSearchParams(params);
      updated.set('tab', next);
      // Keep `next` and other params; replace so tab switches don't fill the history
      setParams(updated, { replace: true });
      backToEmail();
    },
    step,
    email,
    onChangeEmail: backToEmail,
    error,

    google: envConfig.googleClientId && tab === LoginTab.CUSTOMER
      ? {
        clientId: envConfig.googleClientId,
        loading: googleLoading,
        onCredential: async (credential) => {
          setError(undefined);
          try {
            await googleLogin({ id_token: credential }).unwrap();
          } catch (e) {
            setError(apiErrorMessage(e));
          }
        },
      }
      : null,

    emailForm: {
      form: emailForm,
      submitting: starting,
      onSubmit: async (values) => {
        setError(undefined);
        try {
          const { next } = await startOtp({ email: values.email, role: tab }).unwrap();
          setEmail(values.email);
          if (next === 'otp') otp.open({ email: values.email, purpose: OtpPurpose.LOGIN });
          else setStep(tab === LoginTab.CUSTOMER ? LoginStep.DETAILS : LoginStep.NOT_FOUND);
        } catch (e) {
          setError(apiErrorMessage(e));
        }
      },
    },

    detailsForm: {
      form: detailsForm,
      submitting: registering,
      onSubmit: async ({ name, phone }) => {
        setError(undefined);
        try {
          await register({ name: name.trim(), email, phone, role: 'customer' }).unwrap();
          otp.open({ email, purpose: OtpPurpose.SIGNUP });
        } catch (e) {
          setError(apiErrorMessage(e));
        }
      },
    },

    onJoinProvider: () => navigate(email ? withQuery(RouterKeys.REGISTER, { email }) : RouterKeys.REGISTER),
    otp: otp.props,
  };
};
