import { App, Form } from 'antd';
import { useState } from 'react';
import { CatalogLayout } from '@/clients';
import SuspenseWrapper from '@/components/wrapper/SuspenseWrapper';
import { apiErrorMessage } from '@/lib/apiError';
import type { AdminCategory } from '@/pages/admin/types/admin.models';
import {
  useApproveCatalogRequestMutation,
  useGetAdminCatalogQuery,
  useGetCatalogRequestsQuery,
  useRejectCatalogRequestMutation,
  useSaveCategoryMutation,
  useSaveSkillMutation,
} from './catalog.api';
import { skillColumns } from './catalog.colDef';
import type { CatalogFormValues, CatalogLayoutProps, CatalogProps, ServiceRequestRow } from './types/catalog.dto';

type Editing =
  | { kind: 'category'; category: AdminCategory | null }
  | { kind: 'skill'; category: AdminCategory; skill: AdminCategory['skills'][number] | null };

/** /admin/catalog: add or change categories and services; switch them off instead of deleting. */
const useAdminCatalog = (): CatalogProps => {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm<CatalogFormValues>();
  const { data, error, isLoading, refetch } = useGetAdminCatalogQuery();
  const [saveCategory, { isLoading: savingCategory }] = useSaveCategoryMutation();
  const [saveSkill, { isLoading: savingSkill }] = useSaveSkillMutation();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [editorError, setEditorError] = useState<string>();
  const requests = useGetCatalogRequestsQuery();
  const [approveRequest, { isLoading: approving }] = useApproveCatalogRequestMutation();
  const [rejectRequest, { isLoading: rejecting, originalArgs: rejectingKey }] = useRejectCatalogRequestMutation();
  const [approval, setApproval] = useState<{
    request: ServiceRequestRow;
    how: 'new' | 'existing';
    name: string;
    categoryId?: string;
    skillId?: string;
    error?: string;
  } | null>(null);
  const patchApproval = (patch: Partial<NonNullable<typeof approval>>) =>
    setApproval((prev) => prev && { ...prev, ...patch, error: undefined });

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

  const approver: CatalogLayoutProps['approver'] = approval && {
    request: approval.request,
    how: approval.how,
    onHowChange: (how) => patchApproval({ how }),
    name: approval.name,
    onNameChange: (name) => patchApproval({ name }),
    categoryId: approval.categoryId,
    onCategoryChange: (categoryId) => patchApproval({ categoryId }),
    categories: (data ?? []).map((c) => ({ value: c.id, label: c.isActive ? c.name : `${c.name} (off)` })),
    skillId: approval.skillId,
    onSkillChange: (skillId) => patchApproval({ skillId }),
    skills: (data ?? [])
      .filter((c) => c.skills.length > 0)
      .map((c) => ({ label: c.name, options: c.skills.map((s) => ({ value: s.id, label: s.name })) })),
    canSave:
      approval.how === 'existing'
        ? !!approval.skillId
        : !!approval.categoryId && approval.name.trim().length >= 2,
    saving: approving,
    error: approval.error,
    onCancel: () => setApproval(null),
    onSave: async () => {
      const { request, how, name, categoryId, skillId } = approval;
      try {
        if (how === 'existing' && skillId) await approveRequest({ key: request.key, skillId }).unwrap();
        else if (categoryId) await approveRequest({ key: request.key, categoryId, name: name.trim() }).unwrap();
        message.success(
          `Added. ${request.customers} customer${request.customers === 1 ? '' : 's'} now have it as a favourite.`,
        );
        setApproval(null);
      } catch (e) {
        setApproval((prev) => prev && { ...prev, error: apiErrorMessage(e) });
      }
    },
  };

  return {
    requests: requests.data?.length
      ? {
          items: requests.data,
          rejecting: rejecting ? rejectingKey : undefined,
          onApprove: (request) => setApproval({ request, how: 'new', name: request.name }),
          onReject: (request) =>
            modal.confirm({
              title: `Turn down "${request.name}"?`,
              content: `It's removed from ${request.customers} customer${request.customers === 1 ? "'s" : "s'"} favourites, and they'll be asked to pick another service.`,
              okText: 'Turn down',
              okButtonProps: { danger: true },
              onOk: async () => {
                try {
                  await rejectRequest(request.key).unwrap();
                  message.success('Turned down.');
                } catch (e) {
                  message.error(apiErrorMessage(e));
                }
              },
            }),
        }
      : null,
    approver,
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

/** /admin/catalog */
const CatalogPage = () => {
  const props = useAdminCatalog();
  const { catalog } = props;
  return (
    <SuspenseWrapper>
      <CatalogLayout
        {...props}
        skillColumns={(category) => skillColumns((skill) => catalog.status === 'ready' && catalog.onEditSkill(category, skill))}
      />
    </SuspenseWrapper>
  );
};

export default CatalogPage;
