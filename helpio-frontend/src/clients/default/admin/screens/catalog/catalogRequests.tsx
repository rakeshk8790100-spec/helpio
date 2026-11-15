import { Alert, Button, Input, Modal, Radio, Select } from 'antd';
import { Check, Inbox, X } from 'lucide-react';
import { formatShortDate } from '@/lib/utils';
import type { CatalogProps, RequestApprover } from '@/pages/admin/screens/catalog/types/catalog.dto';

/** "Requested by customers": services typed in the favourites popup that the catalog doesn't have. */
export const CatalogRequests = ({ requests }: { requests: NonNullable<CatalogProps['requests']> }) => (
  <section className="mb-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
    <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
      <Inbox size={18} className="text-amber-600" />
      Requested by customers
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
        {requests.items.length}
      </span>
    </h2>
    <p className="mt-0.5 text-xs text-slate-500">
      Customers typed these as favourites. Add one to the catalog and it becomes their favourite; turn it down and
      they're asked to pick another.
    </p>
    <ul className="mt-3 flex flex-col divide-y divide-amber-100 rounded-xl border border-amber-100 bg-white">
      {requests.items.map((row) => (
        <li key={row.key} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
          <span>
            <span className="block text-sm font-medium text-slate-900">{row.name}</span>
            <span className="block text-xs text-slate-500">
              {row.customers} customer{row.customers === 1 ? '' : 's'} · first asked {formatShortDate(row.firstRequestedAt)}
            </span>
          </span>
          <span className="flex gap-2">
            <Button
              size="small"
              danger
              icon={<X size={12} />}
              loading={requests.rejecting === row.key}
              onClick={() => requests.onReject(row)}
            >
              Turn down
            </Button>
            <Button size="small" type="primary" icon={<Check size={12} />} onClick={() => requests.onApprove(row)}>
              Add to catalog
            </Button>
          </span>
        </li>
      ))}
    </ul>
  </section>
);

/** Add a requested service: as a new one in a category, or matched to one that exists. */
export const ApproveRequestDialog = ({ approver: a }: { approver: RequestApprover }) => (
  <Modal
    open
    title={`Add "${a.request.name}"`}
    okText="Add"
    okButtonProps={{ disabled: !a.canSave }}
    confirmLoading={a.saving}
    onOk={a.onSave}
    onCancel={a.onCancel}
    destroyOnHidden
  >
    <Radio.Group
      value={a.how}
      onChange={(e) => a.onHowChange(e.target.value)}
      className="!mb-4 flex flex-col gap-2"
      options={[
        { value: 'new', label: 'New service in a category' },
        { value: 'existing', label: 'Same as a service we already have' },
      ]}
    />
    {a.how === 'new' ? (
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
          Category
          <Select
            value={a.categoryId}
            onChange={a.onCategoryChange}
            options={a.categories}
            placeholder="Pick a category"
            showSearch={{ optionFilterProp: 'label' }}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
          Service name, as customers will see it
          <Input value={a.name} onChange={(e) => a.onNameChange(e.target.value)} maxLength={60} />
        </label>
      </div>
    ) : (
      <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
        Service
        <Select
          value={a.skillId}
          onChange={a.onSkillChange}
          options={a.skills}
          placeholder="Search services"
          showSearch={{ optionFilterProp: 'label' }}
        />
      </label>
    )}
    <p className="mt-3 text-xs text-slate-500">
      {a.request.customers} customer{a.request.customers === 1 ? '' : 's'} asked for this. It becomes their favourite.
    </p>
    {a.error && <Alert type="error" showIcon title={a.error} className="!mt-3" />}
  </Modal>
);
