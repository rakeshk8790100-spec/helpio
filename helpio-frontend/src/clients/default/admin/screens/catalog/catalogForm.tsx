import { Alert, Form, Input, InputNumber, Modal, Switch } from 'antd';
import type { CatalogEditor, CatalogFormValues } from '@/pages/admin/screens/catalog/types/catalog.dto';

/** Add or edit a category or a service in a dialog. */
const CatalogForm = ({ editor }: { editor: CatalogEditor }) => (
  <Modal
    open
    title={editor.title}
    okText="Save"
    confirmLoading={editor.saving}
    onOk={() => editor.form.submit()}
    onCancel={editor.onCancel}
    destroyOnHidden
  >
    <Form<CatalogFormValues>
      form={editor.form}
      layout="vertical"
      requiredMark={false}
      initialValues={editor.initialValues}
      onFinish={editor.onSave}
      preserve={false}
    >
      <Form.Item name="name" label="Name" rules={[{ required: true, whitespace: true, min: 2, max: 60 }]}>
        <Input maxLength={60} />
      </Form.Item>
      {editor.kind === 'category' && (
        <Form.Item
          name="icon"
          label="Icon"
          extra="A lucide icon name, e.g. wrench, zap, paintbrush"
          rules={[{ required: true, pattern: /^[a-z0-9-]{2,40}$/, message: 'Lower-case letters, digits and dashes' }]}
        >
          <Input maxLength={40} />
        </Form.Item>
      )}
      <Form.Item name="sortOrder" label="Order" extra="Lower numbers come first">
        <InputNumber min={0} max={999} className="!w-32" />
      </Form.Item>
      <Form.Item name="isActive" label="Shown to customers and providers" valuePropName="checked">
        <Switch />
      </Form.Item>
    </Form>
    {editor.error && <Alert type="error" showIcon title={editor.error} />}
  </Modal>
);

export default CatalogForm;
