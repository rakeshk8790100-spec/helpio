import type { FormInstance } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { WithStatus } from '@/common/CommonDto';
import type { AdminCategory } from '@/pages/admin/types/admin.models';

/* The catalog admin screen: its layout's props. */

export interface CatalogFormValues {
  name: string;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface CatalogProps {
  catalog: WithStatus<{
    categories: AdminCategory[];
    onAddCategory: () => void;
    onEditCategory: (category: AdminCategory) => void;
    onAddSkill: (category: AdminCategory) => void;
    onEditSkill: (category: AdminCategory, skill: AdminCategory['skills'][number]) => void;
  }>;
  /** Adding or changing a category (with an icon) or a service */
  editor: CatalogEditor | null;
}

/** The layout gets the page's props and, per category, its services table's columns (from catalog.colDef) */
export type CatalogLayoutProps = CatalogProps & {
  skillColumns: (category: AdminCategory) => ColumnsType<AdminCategory['skills'][number]>;
};

/** The add/edit dialog (catalogForm) */
export interface CatalogEditor {
  title: string;
  kind: 'category' | 'skill';
  form: FormInstance<CatalogFormValues>;
  initialValues: CatalogFormValues;
  saving: boolean;
  error?: string;
  onSave: (values: CatalogFormValues) => void;
  onCancel: () => void;
}
