import { Alert, Button, Input, InputNumber, Switch } from 'antd';
import { FlaskConical, Lock, Save } from 'lucide-react';
import { PageHeader } from '@/components/admin';
import { AlertBanner, PageSkeleton, StatusBadge } from '@/components/ui';
import type { SettingFieldView, SettingGroupView, SettingsLayoutProps } from '@/pages/admin/screens/appSettings/types/appSettings.dto';

const FieldInput = ({ field }: { field: SettingFieldView }) => {
  switch (field.kind) {
    case 'bool':
      return <Switch checked={field.value === 'true'} onChange={(on) => field.onChange(on ? 'true' : 'false')} aria-label={field.label} />;
    case 'int':
      return (
        <InputNumber
          value={field.value === '' ? null : Number(field.value)}
          onChange={(value) => field.onChange(value === null ? '' : String(value))}
          className="!w-40"
          aria-label={field.label}
        />
      );
    case 'secret':
      return (
        <Input.Password
          value={field.value}
          onChange={(e) => field.onChange(e.target.value)}
          placeholder={field.placeholder}
          autoComplete="new-password"
          aria-label={field.label}
        />
      );
    default:
      return <Input value={field.value} onChange={(e) => field.onChange(e.target.value)} aria-label={field.label} />;
  }
};

const GroupCard = ({ group }: { group: SettingGroupView }) => (
  <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-base font-semibold text-slate-900">{group.title}</div>
        <div className="mt-0.5 text-xs text-slate-500">{group.description}</div>
      </div>
      <span className="flex shrink-0 gap-2">
        {group.test && (
          <Button icon={<FlaskConical size={14} />} loading={group.test.running} onClick={group.test.onTest}>
            Test
          </Button>
        )}
        <Button type="primary" icon={<Save size={14} />} disabled={!group.dirty} loading={group.saving} onClick={group.onSave}>
          Save
        </Button>
      </span>
    </div>
    {group.test?.result && (
      <div role="status" className="mt-3 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700">
        <StatusBadge label={group.test.result.label} tone={group.test.result.tone} />
        <span className="pt-0.5">{group.test.result.message}</span>
      </div>
    )}
    <div className="mt-4 flex flex-col divide-y divide-slate-100">
      {group.fields.map((field) => (
        <div key={field.key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] items-center gap-4 py-3">
          <div className="min-w-0">
            <div className="text-sm font-medium text-slate-900">{field.label}</div>
            {field.help && <div className="text-xs text-slate-500">{field.help}</div>}
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <StatusBadge label={field.source.label} tone={field.source.tone} />
              {field.unreadable && <span className="text-[11px] font-medium text-red-600">Saved value can't be decrypted; .env is used</span>}
              {field.onReset && (
                <button type="button" onClick={field.onReset} className="text-[11px] font-semibold text-indigo-600">
                  Use the .env value
                </button>
              )}
            </div>
          </div>
          <FieldInput field={field} />
        </div>
      ))}
    </div>
  </section>
);

/** /admin/settings (owner): third-party keys (secrets stored encrypted), app values and the approval switches. */
const AppSettingsLayout = (p: SettingsLayoutProps) => {
  if (p.status === 'loading') return <PageSkeleton />;
  if (p.status === 'error') return <AlertBanner message={p.message} onRetry={p.onRetry} />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Integrations & settings"
        description="Values saved here replace the server's .env values within 15 seconds. Secrets are stored encrypted and never shown in full."
      />
      {p.secretsLocked && (
        <Alert
          type="warning"
          showIcon
          icon={<Lock size={16} />}
          title="Keys and secrets can't be saved here yet"
          description="Set SETTINGS_ENCRYPTION_KEY on the server. Other settings can be changed now."
        />
      )}
      <div className="grid grid-cols-2 gap-6">
        {p.groups.map((group) => (
          <GroupCard key={group.id} group={group} />
        ))}
      </div>
    </div>
  );
};

export default AppSettingsLayout;
