import { useState } from 'react';
import { App, Form } from 'antd';
import type { CatalogFormValues, CatalogLayoutProps } from '../../client/default/admin/admin.layout.types';
import type { AdminCategory } from '../../common/CommonDto';
import { apiErrorMessage } from '../../lib/apiError';
import { useGetAdminCatalogQuery, useSaveCategoryMutation, useSaveSkillMutation } from '../../pages/admin/admin.api';

type Editing =
  | { kind: 'category'; category: AdminCategory | null }
  | { kind: 'skill'; category: AdminCategory; skill: AdminCategory['skills'][number] | null };

/** /admin/catalog: add or change categories and services; switch them off instead of deleting. */
export const useAdminCatalog = (): CatalogLayoutProps => {
  const { message } = App.useApp();
  const [form] = Form.useForm<CatalogFormValues>();
  const { data, error, isLoading, refetch } = useGetAdminCatalogQuery();
  const [saveCategory, { isLoading: savingCategory }] = useSaveCategoryMutation();
  const [saveSkill, { isLoading: savingSkill }] = useSaveSkillMutation();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [editorError, setEditorError] = useState<string>();

  const open = (next: Editing) => {
    setEditorError(undefined);
    setEditing(next);
  };

  const editor: CatalogLayoutProps['editor'] = editing && {
    kind: editing.kind,
    form,
    title:
      editing.kind === 'category'
        ? editing.category
          ? `Change ${editing.category.name}`
          : 'Add a category'
        : editing.skill
          ? `Change ${editing.skill.name}`
          : `Add a service to ${editing.category.name}`,
    initialValues:
      editing.kind === 'category'
        ? {
            name: editing.category?.name ?? '',
            icon: editing.category?.icon ?? '',
            sortOrder: editing.category?.sortOrder ?? (data?.length ?? 0) + 1,
            isActive: editing.category?.isActive ?? true,
          }
        : {
            name: editing.skill?.name ?? '',
            sortOrder: editing.skill?.sortOrder ?? editing.category.skills.length + 1,
            isActive: editing.skill?.isActive ?? true,
          },
    saving: savingCategory || savingSkill,
    error: editorError,
    onCancel: () => setEditing(null),
    onSave: async (values) => {
      setEditorError(undefined);
      try {
        if (editing.kind === 'category') {
          await saveCategory({
            id: editing.category?.id,
            name: values.name.trim(),
            icon: (values.icon ?? '').trim(),
            sortOrder: values.sortOrder ?? 0,
            isActive: values.isActive,
          }).unwrap();
        } else {
          await saveSkill({
            categoryId: editing.category.id,
            id: editing.skill?.id,
            name: values.name.trim(),
            sortOrder: values.sortOrder ?? 0,
            isActive: values.isActive,
          }).unwrap();
        }
        message.success(values.isActive ? 'Saved.' : 'Saved and switched off. Pickers no longer show it.');
        setEditing(null);
      } catch (e) {
        setEditorError(apiErrorMessage(e));
      }
    },
  };

  return {
    catalog: isLoading
      ? { status: 'loading' }
      : !data
        ? { status: 'error', message: apiErrorMessage(error), onRetry: refetch }
        : {
            status: 'ready',
            categories: data,
            onAddCategory: () => open({ kind: 'category', category: null }),
            onEditCategory: (category) => open({ kind: 'category', category }),
            onAddSkill: (category) => open({ kind: 'skill', category, skill: null }),
            onEditSkill: (category, skill) => open({ kind: 'skill', category, skill }),
          },
    editor,
  };
};
