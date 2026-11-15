import { Alert, Button, Form } from 'antd';
import { UserRoundCheck } from 'lucide-react';
import { NameField, PhoneField } from '@/clients/default/auth/shared/authFields';
import type { CompleteProfileLayoutProps } from '@/pages/auth/types/auth.dto';

/** One-time step after Google sign-in when the account has no name or mobile number yet. */
const CompleteProfileLayout = (p: CompleteProfileLayoutProps) => (
  <div className="flex flex-col gap-6">
    <div className="flex flex-col items-start gap-3">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
        <UserRoundCheck size={22} />
      </span>
      <div>
        <div className="text-2xl font-bold text-slate-900">One last step</div>
        <div className="mt-1 text-sm text-slate-600">
          Add your mobile number so professionals can reach you once you hire. It stays private until then.
        </div>
      </div>
    </div>

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
      <PhoneField />
      <Button type="primary" htmlType="submit" size="large" block loading={p.submitting}>
        Save and continue
      </Button>
    </Form>

    <div className="text-center text-sm text-slate-600">
      Signed in as {p.email}.{' '}
      <Button type="link" onClick={p.onLogout} className="!px-0 !font-semibold">
        Log out
      </Button>
    </div>
  </div>
);

export default CompleteProfileLayout;
