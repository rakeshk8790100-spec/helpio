import { Alert, Button, Form } from 'antd';
import { ShieldCheck } from 'lucide-react';
import { EmailField, PasswordField } from '../auth/authFields';
import EmailCodeStep from '../auth/emailCodeStep';
import AdminAuthCard from './adminAuthCard';
import type { AdminLoginLayoutProps } from './admin.layout.types';

/** /admin/login: email and password, then the code emailed to the admin. */
const AdminLoginLayout = (p: AdminLoginLayoutProps) => (
  <AdminAuthCard>
    {p.code ? (
      <EmailCodeStep {...p.code} error={p.error} title="Enter your login code" submitLabel="Log in" />
    ) : (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col items-start gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <ShieldCheck size={22} />
          </span>
          <div>
            <div className="text-xl font-bold text-slate-900">Admin console</div>
            <div className="mt-1 text-sm text-slate-600">After your password we'll email you a code to finish logging in.</div>
          </div>
        </div>
        {p.error && <Alert type="error" showIcon title={p.error} />}
        <Form form={p.form} layout="vertical" requiredMark={false} onFinish={p.onSubmit}>
          <EmailField />
          <PasswordField autoComplete="current-password" />
          <Button type="primary" htmlType="submit" size="large" block loading={p.sending}>
            Continue
          </Button>
        </Form>
        <div className="text-center text-sm text-slate-600">
          New to the team?{' '}
          <button type="button" onClick={p.onRequestAccess} className="font-semibold text-indigo-600">
            Ask for access
          </button>
        </div>
      </div>
    )}
  </AdminAuthCard>
);

export default AdminLoginLayout;
