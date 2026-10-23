import { Alert, Button, Checkbox, Form } from 'antd';
import { OtpVerify } from '../../../component/marketplace';
import { StepProgress } from '../../../component/ui';
import { PROVIDER_SIGNUP_STEPS } from '../onboarding/onboarding.layout.types';
import { EmailField, NameField, PhoneField } from './authFields';
import type { RegisterLayoutProps } from './register.layout.types';

/** /register: provider sign-up step 1 (details + email code). Skills and service area follow. */
const RegisterLayout = (p: RegisterLayoutProps) => (
  <div className="flex flex-col gap-6">
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-600">For professionals</div>
      <div className="mt-1 text-2xl font-bold text-slate-900">Join Helpio as a pro</div>
      <div className="mt-1 text-sm text-slate-600">Three quick steps, about 3 minutes. Free to join.</div>
    </div>

    <StepProgress steps={PROVIDER_SIGNUP_STEPS} current={1} />

    {p.otp ? (
      <OtpVerify {...p.otp} />
    ) : (
      <>
        {p.error && <Alert type="error" showIcon title={p.error} />}
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
          <Form.Item
            name="agree"
            valuePropName="checked"
            rules={[{ validator: (_, checked: boolean) => (checked ? Promise.resolve() : Promise.reject(new Error('Please accept to continue'))) }]}
          >
            <Checkbox>I agree to Helpio's Terms for Professionals and Privacy Policy</Checkbox>
          </Form.Item>
          <Button type="primary" htmlType="submit" size="large" block loading={p.submitting}>
            Verify email
          </Button>
        </Form>
        <div className="text-center text-sm text-slate-600">
          Already joined?{' '}
          <Button type="link" onClick={p.onLogin} className="!px-0 !font-semibold">
            Log in
          </Button>
        </div>
      </>
    )}
  </div>
);

export default RegisterLayout;
