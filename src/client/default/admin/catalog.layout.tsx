import { Alert, Button, Form, Input, InputNumber, Modal, Switch, Table } from 'antd';
import { Pencil, Plus } from 'lucide-react';
import { categoryIcon } from '../../../component/marketplace';
import { PageHeader } from '../../../component/admin';
import { AlertBanner, PageSkeleton, StatusBadge } from '../../../component/ui';
import type { AdminCategory } from '../../../common/CommonDto';
import type { CatalogFormValues, CatalogLayoutProps } from './admin.layout.types';

type Skill = AdminCategory['skills'][number];

/** /admin/catalog: service categories and their services; switch off instead of deleting. */
const CatalogLayout = (p: CatalogLayoutProps) => {
  if (p.catalog.status === 'loading') return <PageSkeleton />;
  if (p.catalog.status === 'error') return <AlertBanner message={p.catalog.message} onRetry={p.catalog.onRetry} />;
  const c = p.catalog;

  return (
    <div>
      <PageHeader
        title="Catalog"
        description="What customers can ask for and providers can offer. Switching something off hides it from pickers; jobs and providers that have it keep it."
        actions={
          <Button type="primary" icon={<Plus size={14} />} onClick={c.onAddCategory}>
            Add category
          </Button>
        }
      />
      <div className="flex flex-col gap-4">
        {c.categories.map((category) => {
          const Icon = categoryIcon(category.icon);
          return (
            <section key={category.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Icon size={18} />
                  </span>
                  <span>
                    <span className="flex items-center gap-2 text-base font-semibold text-slate-900">
                      {category.name}
                      {!category.isActive && <StatusBadge label="Off" tone="neutral" />}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {category.jobs} job{category.jobs === 1 ? '' : 's'} · {category.skills.length} services · order {category.sortOrder}
                    </span>
                  </span>
                </span>
                <span className="flex gap-2">
                  <Button size="small" icon={<Pencil size={12} />} onClick={() => c.onEditCategory(category)}>
                    Edit
                  </Button>
                  <Button size="small" icon={<Plus size={12} />} onClick={() => c.onAddSkill(category)}>
                    Add service
                  </Button>
                </span>
              </div>
              <Table<Skill>
                rowKey="id"
                size="small"
                className="!mt-3"
                pagination={false}
                dataSource={category.skills}
                columns={[
                  {
                    title: 'Service',
                    render: (_, s) => (
                      <span className="flex items-center gap-2 text-sm text-slate-800">
                        {s.name}
                        {!s.isActive && <StatusBadge label="Off" tone="neutral" />}
                      </span>
                    ),
                  },
                  { title: 'Providers', width: 100, render: (_, s) => <span className="text-sm text-slate-700">{s.providers}</span> },
                  { title: 'Order', width: 80, render: (_, s) => <span className="text-xs text-slate-500">{s.sortOrder}</span> },
                  {
                    title: '',
                    width: 80,
                    align: 'right',
                    render: (_, s) => (
                      <Button size="small" type="link" onClick={() => c.onEditSkill(category, s)}>
                        Edit
                      </Button>
                    ),
                  },
                ]}
              />
            </section>
          );
        })}
      </div>

      {p.editor && (
        <Modal
          open
          title={p.editor.title}
          okText="Save"
          confirmLoading={p.editor.saving}
          onOk={() => p.editor?.form.submit()}
          onCancel={p.editor.onCancel}
          destroyOnHidden
        >
          <Form<CatalogFormValues>
            form={p.editor.form}
            layout="vertical"
            requiredMark={false}
            initialValues={p.editor.initialValues}
            onFinish={p.editor.onSave}
            preserve={false}
          >
            <Form.Item name="name" label="Name" rules={[{ required: true, whitespace: true, min: 2, max: 60 }]}>
              <Input maxLength={60} />
            </Form.Item>
            {p.editor.kind === 'category' && (
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
          {p.editor.error && <Alert type="error" showIcon title={p.editor.error} />}
        </Modal>
      )}
    </div>
  );
};

export default CatalogLayout;
