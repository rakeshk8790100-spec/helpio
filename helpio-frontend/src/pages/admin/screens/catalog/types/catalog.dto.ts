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
  /** Services customers asked for; hidden when there are none */
  requests: {
    items: ServiceRequestRow[];
    onApprove: (row: ServiceRequestRow) => void;
    onReject: (row: ServiceRequestRow) => void;
    /** The row being turned down right now */
    rejecting?: string;
  } | null;
  /** Adding a requested service to the catalog */
  approver: RequestApprover | null;
}

/** Customers asking for the same service, as one row */
export interface ServiceRequestRow {
  key: string;
  name: string;
  customers: number;
  firstRequestedAt: string;
}

/** The approve dialog: a new service in a category, or the same as one that exists */
export interface RequestApprover {
  request: ServiceRequestRow;
  how: 'new' | 'existing';
  onHowChange: (how: 'new' | 'existing') => void;
  name: string;
  onNameChange: (name: string) => void;
  categoryId?: string;
  onCategoryChange: (id: string) => void;
  categories: { value: string; label: string }[];
  skillId?: string;
  onSkillChange: (id: string) => void;
  /** Services by category */
  skills: { label: string; options: { value: string; label: string }[] }[];
  canSave: boolean;
  saving: boolean;
  error?: string;
  onSave: () => void;
  onCancel: () => void;
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
