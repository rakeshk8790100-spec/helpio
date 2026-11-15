import { Button, Table } from 'antd';
import { Pencil, Plus } from 'lucide-react';
import { PageHeader } from '@/components/admin';
import { categoryIcon } from '@/components/common';
import { AlertBanner, PageSkeleton, StatusBadge } from '@/components/ui';
import type { CatalogLayoutProps } from '@/pages/admin/screens/catalog/types/catalog.dto';
import type { AdminCategory } from '@/pages/admin/types/admin.models';
import CatalogForm from './catalogForm';

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
              <Table<AdminCategory['skills'][number]>
                rowKey="id"
                size="small"
                className="!mt-3"
                pagination={false}
                dataSource={category.skills}
                columns={p.skillColumns(category)}
              />
            </section>
          );
        })}
      </div>

      {p.editor && <CatalogForm editor={p.editor} />}
    </div>
  );
};

export default CatalogLayout;
