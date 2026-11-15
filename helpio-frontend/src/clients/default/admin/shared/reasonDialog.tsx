import { Alert, Input, Modal } from 'antd';
import type { ReasonDialogProps } from '@/pages/admin/types/admin.models';

/** Confirm a rejection or deactivation, with the reason the person (or the audit log) gets. */
const ReasonDialog = (p: ReasonDialogProps) => (
  <Modal
    open
    title={p.title}
    okText={p.okText}
    okButtonProps={{ danger: true }}
    confirmLoading={p.sending}
    onOk={p.onConfirm}
    onCancel={p.onCancel}
    destroyOnHidden
  >
    <Input.TextArea
      value={p.reason}
      onChange={(e) => p.onReasonChange(e.target.value)}
      rows={3}
      maxLength={500}
      placeholder={p.required ? 'Why? They will see this in the email.' : 'Reason (optional, for the audit log)'}
      aria-label="Reason"
    />
    {p.error && <Alert type="error" showIcon title={p.error} className="!mt-3" />}
  </Modal>
);

export default ReasonDialog;
