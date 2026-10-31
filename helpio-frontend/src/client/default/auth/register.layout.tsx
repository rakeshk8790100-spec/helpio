import { Alert, Button, Checkbox, Form } from 'antd';
import { StepProgress } from '../../../component/ui';
import { PROVIDER_SIGNUP_STEPS } from '../onboarding/onboarding.layout.types';
import AuthHeader from './authHeader';
import { EmailField, NameField, PasswordField, PhoneField } from './authFields';
import EmailCodeStep from './emailCodeStep';
import type { RegisterLayoutProps } from './register.layout.types';

/** /pro/signup: provider sign-up step 1 (details + password, then the emailed code). Skills and service area follow. */
const RegisterLayout = (p: RegisterLayoutProps) => (
  <div className="flex flex-col gap-6">
    <AuthHeader forProfessionals title="Join Helpio as a pro" subtitle="Three quick steps, about 3 minutes. Free to join." />

    <StepProgress steps={PROVIDER_SIGNUP_STEPS} current={1} />

    {p.code ? (
      <EmailCodeStep {...p.code} error={p.error} />
    ) : (
      <>
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
            <NameField />
            <EmailField />
            <PhoneField />
            <PasswordField />
            <Form.Item
              name="agree"
              valuePropName="checked"
              rules={[{ validator: (_, checked: boolean) => (checked ? Promise.resolve() : Promise.reject(new Error('Please accept to continue'))) }]}
            >
              <Checkbox>I agree to Helpio's Terms for Professionals and Privacy Policy</Checkbox>
            </Form.Item>
            <Button type="primary" htmlType="submit" size="large" block loading={p.submitting}>
              Continue
            </Button>
          </Form>
        </section>
      </>
    )}

    <div className="flex flex-col items-center text-sm text-slate-600">
      <div>
        Already joined?{' '}
        <Button type="link" onClick={p.onLogin} className="!px-0 !font-semibold">
          Log in
        </Button>
      </div>
      <div>
        Need help at home?{' '}
        <Button type="link" onClick={p.onSwitchAudience} className="!px-0 !font-semibold">
          Sign up as a customer
        </Button>
      </div>
    </div>
  </div>
);

export default RegisterLayout;
