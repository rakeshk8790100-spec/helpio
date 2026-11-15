import { Alert, Button, Form } from 'antd';
import { Hourglass, MailCheck, UserPlus } from 'lucide-react';
import AdminAuthCard from '@/clients/default/admin/shared/adminAuthCard';
import { EmailField, NameField, PasswordField, PhoneField } from '@/clients/default/auth/shared/authFields';
import EmailCodeStep from '@/clients/default/auth/shared/emailCodeStep';
import type { AdminRequestAccessLayoutProps } from '@/pages/admin/screens/adminRequestAccess/types/adminRequestAccess.dto';

/** /admin/request-access: details, the emailed code, then "waiting for the owner" (or "log in" for the owner). */
const AdminRequestAccessLayout = (p: AdminRequestAccessLayoutProps) => (
  <AdminAuthCard>
    {p.result ? (
      <div className="flex flex-col items-start gap-3">
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
            p.result.approved ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
          }`}
        >
          {p.result.approved ? <MailCheck size={22} /> : <Hourglass size={22} />}
        </span>
        <h1 className="text-xl font-bold tracking-normal text-slate-900">{p.result.approved ? "You're the owner" : 'Request sent'}</h1>
        <div role="status" className="text-sm text-slate-600">
          {p.result.approved
            ? 'Your access is ready. Log in with your email and password.'
            : `We've asked the owner to approve access for ${p.result.email}. You'll get an email as soon as they do.`}
        </div>
        <Button type={p.result.approved ? 'primary' : 'default'} size="large" block onClick={p.onLogin} className="!mt-2">
          Go to log-in
        </Button>
      </div>
    ) : p.code ? (
      <EmailCodeStep {...p.code} error={p.error} submitLabel="Send request" />
    ) : (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col items-start gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <UserPlus size={22} />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-normal text-slate-900">Ask for admin access</h1>
            <div className="mt-1 text-sm text-slate-600">
              The owner approves every new admin. You'll log in with this email and password once they do.
            </div>
          </div>
        </div>
        {p.error && <Alert type="error" showIcon title={p.error} />}
        <Form form={p.form} layout="vertical" requiredMark={false} onFinish={p.onSubmit}>
          <NameField />
          <EmailField />
          <PhoneField />
          <PasswordField />
          <Button type="primary" htmlType="submit" size="large" block loading={p.sending}>
            Continue
          </Button>
        </Form>
        <div className="text-center text-sm text-slate-600">
          Already approved?{' '}
          <button type="button" onClick={p.onLogin} className="font-semibold text-indigo-600">
            Log in
          </button>
        </div>
      </div>
    )}
  </AdminAuthCard>
);

export default AdminRequestAccessLayout;
