import type { ReactNode } from 'react';
import { Alert, Button, Drawer, Form, Input, Popconfirm, Skeleton } from 'antd';
import {
  Briefcase,
  Eye,
  House,
  KeyRound,
  LifeBuoy,
  LogOut,
  MapPin,
  MapPinned,
  Pencil,
  Plus,
  ShieldCheck,
  Star,
  Trash2,
  UserRound,
  Wrench,
} from 'lucide-react';
import { AddressLabel } from '../../../common/CommonEnum';
import { AlertBanner, AvatarUpload, MenuRow, StatusBadge } from '../../../component/ui';
import type { FormSheet, ProfileLayoutProps } from './profile.layout.types';

const LABEL_ICON = { [AddressLabel.HOME]: House, [AddressLabel.WORK]: Briefcase, [AddressLabel.OTHER]: MapPin };
const LABEL_TEXT = { [AddressLabel.HOME]: 'Home', [AddressLabel.WORK]: 'Work', [AddressLabel.OTHER]: 'Other' };

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section>
    <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{title}</div>
    <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      {children}
    </div>
  </section>
);

/** Bottom sheet holding one form, with a full-width submit button. */
const Sheet = <T extends object>({
  sheet,
  title,
  submitLabel,
  children,
}: {
  sheet: FormSheet<T>;
  title: string;
  submitLabel: string;
  children: ReactNode;
}) => (
  <Drawer open={sheet.open} onClose={sheet.onClose} placement="bottom" height="auto" title={title} destroyOnHidden>
    <Form form={sheet.form} layout="vertical" requiredMark={false} initialValues={sheet.initialValues} onFinish={sheet.onSubmit}>
      {children}
      {sheet.error && <Alert type="error" showIcon title={sheet.error} className="!mb-3" />}
      <Button type="primary" htmlType="submit" size="large" block loading={sheet.saving}>
        {submitLabel}
      </Button>
    </Form>
  </Drawer>
);

/** /profile for customers and providers: account, then role sections, security, help and log out. */
const ProfileLayout = (p: ProfileLayoutProps) => (
  <div className="flex flex-col gap-6">
    {/* ① Account */}
    <div className="flex items-center gap-4">
      <AvatarUpload name={p.account.name} src={p.account.avatarUrl} uploading={p.account.uploading} onPick={p.account.onPickPhoto} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-xl font-bold text-slate-900">{p.account.name}</div>
        <div className="truncate text-sm text-slate-500">{p.account.email}</div>
        <div className="mt-1 flex items-center gap-2">
          <StatusBadge label={p.account.roleLabel} tone="brand" />
          {p.account.onRemovePhoto && (
            <button type="button" onClick={p.account.onRemovePhoto} className="text-xs font-medium text-slate-500">
              Remove photo
            </button>
          )}
        </div>
      </div>
    </div>

    <Section title="Your details">
      <MenuRow Icon={UserRound} label="Name and mobile" hint={p.account.phone ?? 'Add your mobile number'} onClick={p.details.onOpen} />
    </Section>

    {/* ② Customer: saved addresses */}
    {p.addresses && (
      <section>
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Saved addresses</span>
          {p.addresses.status === 'ready' && p.addresses.items.length < p.addresses.max && (
            <button type="button" onClick={p.addresses.onAdd} className="flex items-center gap-1 text-xs font-semibold text-indigo-600">
              <Plus size={14} />
              Add
            </button>
          )}
        </div>
        {p.addresses.status === 'loading' && <Skeleton active paragraph={{ rows: 2 }} />}
        {p.addresses.status === 'error' && <AlertBanner message={p.addresses.message} onRetry={p.addresses.onRetry} />}
        {p.addresses.status === 'ready' &&
          (p.addresses.items.length ? (
            <div className="flex flex-col gap-2">
              {p.addresses.items.map(({ address: a, onEdit, onMakeDefault, onDelete }) => {
                const Icon = LABEL_ICON[a.label];
                return (
                  <div key={a.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                        <Icon size={18} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">{LABEL_TEXT[a.label]}</span>
                          {a.isDefault && <StatusBadge label="Default" tone="success" />}
                        </div>
                        <div className="text-xs text-slate-600">
                          {a.areaName} {a.pincode}
                        </div>
                        {a.addressLine && <div className="mt-0.5 line-clamp-2 text-xs text-slate-500">{a.addressLine}</div>}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-4 border-t border-slate-100 pt-2 text-xs font-semibold">
                      <button type="button" onClick={onEdit} className="flex items-center gap-1 text-indigo-600">
                        <Pencil size={12} />
                        Edit
                      </button>
                      {!a.isDefault && (
                        <button type="button" onClick={onMakeDefault} className="flex items-center gap-1 text-slate-600">
                          <Star size={12} />
                          Make default
                        </button>
                      )}
                      <Popconfirm title="Remove this address?" okText="Remove" okButtonProps={{ danger: true }} onConfirm={onDelete}>
                        <button type="button" className="ml-auto flex items-center gap-1 text-red-600">
                          <Trash2 size={12} />
                          Remove
                        </button>
                      </Popconfirm>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <button
              type="button"
              onClick={p.addresses.onAdd}
              className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-slate-200 p-4 text-left active:scale-[.98]"
            >
              <MapPinned size={20} className="text-indigo-500" />
              <span className="text-sm text-slate-600">
                Add your home address to post jobs faster and find pros near you.
              </span>
            </button>
          ))}
      </section>
    )}

    {/* ② Provider: public profile and work settings */}
    {p.provider && (
      <Section title="Your work">
        <MenuRow Icon={Pencil} label="About you" hint={p.provider.bio ?? 'Add a short bio customers will see'} onClick={p.provider.bioSheet.onOpen} />
        <MenuRow Icon={Wrench} label="Skills" hint={p.provider.skillsHint} onClick={p.provider.onSkills} />
        <MenuRow Icon={MapPinned} label="Service area, radius and hours" hint={p.provider.areaHint} onClick={p.provider.onArea} />
        <MenuRow Icon={Eye} label="Preview my public profile" onClick={p.provider.onPreview} />
        <MenuRow
          Icon={ShieldCheck}
          label="ID and selfie verification"
          hint="Builds customer trust"
          trailing={<StatusBadge label="Coming soon" tone="neutral" />}
          disabled
        />
      </Section>
    )}

    {/* ③ Security, help, log out */}
    <Section title="Security">
      <MenuRow Icon={KeyRound} label="Change password" hint="Signs you out on other devices" onClick={p.password.onOpen} />
    </Section>
    <Section title="Help">
      <MenuRow Icon={LifeBuoy} label="Help and support" trailing={<StatusBadge label="Coming soon" tone="neutral" />} disabled />
    </Section>
    <Section title="Account">
      <MenuRow Icon={LogOut} label={p.loggingOut ? 'Logging out…' : 'Log out'} tone="danger" onClick={p.onLogout} disabled={p.loggingOut} />
    </Section>

    {/* Sheets */}
    <Sheet sheet={p.details} title="Name and mobile" submitLabel="Save">
      <Form.Item
        name="name"
        label="Full name"
        rules={[{ required: true, whitespace: true, message: 'Enter your name' }, { min: 2, max: 80, message: 'Use 2 to 80 characters' }]}
      >
        <Input size="large" autoComplete="name" maxLength={80} />
      </Form.Item>
      <Form.Item
        name="phone"
        label="Mobile number"
        normalize={(value: string) => value.replace(/\D/g, '').slice(-10)}
        rules={[{ required: true, message: 'Enter your mobile number' }, { pattern: /^[6-9]\d{9}$/, message: 'Enter a 10-digit mobile number' }]}
      >
        <Input size="large" prefix="+91" inputMode="numeric" autoComplete="tel-national" maxLength={10} />
      </Form.Item>
    </Sheet>

    <Sheet sheet={p.password} title="Change password" submitLabel="Change password">
      <Form.Item name="currentPassword" label="Current password" rules={[{ required: true, message: 'Enter your current password' }]}>
        <Input.Password size="large" autoComplete="current-password" />
      </Form.Item>
      <Form.Item
        name="newPassword"
        label="New password"
        rules={[{ required: true, message: 'Choose a new password' }, { min: 8, max: 128, message: 'Use 8 to 128 characters' }]}
      >
        <Input.Password size="large" autoComplete="new-password" />
      </Form.Item>
      <Form.Item
        name="confirmPassword"
        label="Confirm new password"
        dependencies={['newPassword']}
        rules={[
          { required: true, message: 'Type the new password again' },
          ({ getFieldValue }) => ({
            validator: (_, value) =>
              !value || value === getFieldValue('newPassword') ? Promise.resolve() : Promise.reject(new Error("Passwords don't match")),
          }),
        ]}
      >
        <Input.Password size="large" autoComplete="new-password" />
      </Form.Item>
    </Sheet>

    {p.provider && (
      <Sheet sheet={p.provider.bioSheet} title="About you" submitLabel="Save">
        <Form.Item name="bio" label="What customers should know" extra="Experience, specialities, how you work. No phone numbers.">
          <Input.TextArea rows={5} maxLength={500} showCount placeholder="10 years fixing leaks and bathroom fittings in Mira Road…" />
        </Form.Item>
      </Sheet>
    )}
  </div>
);

export default ProfileLayout;
