import { Alert, Button, Drawer, Form, Input, Switch } from 'antd';
import { MapPin } from 'lucide-react';
import { AddressLabel } from '@/common/CommonEnum';
import { ADDRESS_LABEL } from '@/common/CommonLabels';
import { CurrentLocationButton } from '@/components/common';
import { ChipSelect } from '@/components/ui';
import type { AddressEditorProps } from '@/pages/profile/screens/profile/types/profile.dto';

const LABELS = Object.values(AddressLabel).map((value) => ({ value, label: ADDRESS_LABEL[value] }));

/** Bottom sheet to add or edit a saved address. */
const AddressEditorLayout = (p: AddressEditorProps) => (
  <Drawer
    open={p.open}
    onClose={p.onClose}
    placement="bottom"
    height="auto"
    title={p.isNew ? 'Add an address' : 'Edit address'}
    destroyOnHidden
  >
    <Form form={p.form} layout="vertical" requiredMark={false} initialValues={p.initialValues} onFinish={p.onSubmit}>
      <Form.Item name="label" label="Save as">
        <ChipSelect options={LABELS} ariaLabel="Address label" />
      </Form.Item>
      <CurrentLocationButton {...p.location} />
      <div className="grid grid-cols-[2fr_3fr] gap-3">
        <Form.Item
          name="pincode"
          label="Pincode"
          normalize={(value: string) => value.replace(/\D/g, '')}
          rules={[{ required: true, message: 'Enter the pincode' }, { pattern: /^[1-9]\d{5}$/, message: 'Enter a 6-digit pincode' }]}
        >
          <Input size="large" inputMode="numeric" maxLength={6} autoComplete="postal-code" placeholder="401107" />
        </Form.Item>
        <Form.Item
          name="areaName"
          label="Area / locality"
          rules={[{ required: true, whitespace: true, message: 'Enter the area' }, { min: 2, max: 80, message: 'Use 2 to 80 characters' }]}
        >
          <Input size="large" prefix={<MapPin size={14} className="text-slate-400" />} maxLength={80} placeholder="Mira Road" />
        </Form.Item>
      </div>
      <Form.Item
        name="addressLine"
        label="Full address (optional)"
        extra="House or flat, building and street. Shared only with the pro you hire."
      >
        <Input.TextArea rows={2} maxLength={300} autoComplete="street-address" />
      </Form.Item>
      <div className="mb-4 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
        <span className="text-sm text-slate-700">Use as my default address</span>
        <Form.Item name="isDefault" valuePropName="checked" className="!mb-0">
          <Switch aria-label="Default address" />
        </Form.Item>
      </div>
      {p.error && <Alert type="error" showIcon title={p.error} className="!mb-3" />}
      <Button type="primary" htmlType="submit" size="large" block loading={p.saving}>
        {p.isNew ? 'Save address' : 'Save changes'}
      </Button>
    </Form>
  </Drawer>
);

export default AddressEditorLayout;
