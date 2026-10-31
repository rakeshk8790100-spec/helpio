import { useState } from 'react';
import { App } from 'antd';
import type { SettingFieldView, SettingGroupView, SettingsLayoutProps } from '../../client/default/admin/admin.layout.types';
import type { SettingField } from '../../common/CommonDto';
import type { BadgeTone } from '../../component/ui';
import { apiErrorMessage } from '../../lib/apiError';
import { useGetAppSettingsQuery, useTestAppSettingsMutation, useUpdateAppSettingsMutation } from '../../pages/admin/admin.api';
import { checkBadge } from './useSystemStatus';

const SOURCE: Record<SettingField['source'], { label: string; tone: BadgeTone }> = {
  panel: { label: 'Saved here', tone: 'brand' },
  env: { label: 'From .env', tone: 'neutral' },
  missing: { label: 'Not set', tone: 'warning' },
};

/** /admin/settings (owner): edit a group, Save it (only what changed), Test the service, or go back to .env. */
export const useAppSettings = (): SettingsLayoutProps => {
  const { message } = App.useApp();
  const { data, error, isLoading, refetch } = useGetAppSettingsQuery();
  const [update] = useUpdateAppSettingsMutation();
  const [test] = useTestAppSettingsMutation();
  // Typed but not saved yet, by setting key
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { label: string; tone: BadgeTone; message: string }>>({});

  if (isLoading) return { status: 'loading' };
  if (!data) return { status: 'error', message: apiErrorMessage(error), onRetry: refetch };

  const save = async (group: string, changes: Record<string, string | null>, done: string) => {
    setSaving(group);
    try {
      await update(changes).unwrap();
      setDrafts((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !(key in changes))));
      // A new key needs a new test
      setResults((current) => Object.fromEntries(Object.entries(current).filter(([id]) => id !== group)));
      message.success(done);
    } catch (e) {
      message.error(apiErrorMessage(e));
    } finally {
      setSaving(null);
    }
  };

  const groups: SettingGroupView[] = data.groups.map((group) => {
    const changed = group.fields.filter((f) => drafts[f.key] !== undefined && !(f.kind === 'secret' && drafts[f.key] === ''));
    const fields: SettingFieldView[] = group.fields.map((f) => ({
      key: f.key,
      label: f.label,
      help: f.help,
      kind: f.kind,
      value: drafts[f.key] ?? (f.kind === 'secret' ? '' : (f.value ?? '')),
      placeholder: f.kind === 'secret' ? (f.value ? `Saved: ${f.value}. Type a new one to replace it` : 'Not set') : undefined,
      source: SOURCE[f.source],
      unreadable: f.unreadable,
      onChange: (value) => setDrafts((current) => ({ ...current, [f.key]: value })),
      onReset:
        f.source === 'panel'
          ? () => save(group.id, { [f.key]: null }, `${f.label} now comes from .env.`)
          : undefined,
    }));
    return {
      id: group.id,
      title: group.title,
      description: group.description,
      fields,
      dirty: changed.length > 0,
      saving: saving === group.id,
      onSave: () =>
        save(
          group.id,
          Object.fromEntries(changed.map((f) => [f.key, drafts[f.key]])),
          `${group.title} saved. It's in force within 15 seconds.`,
        ),
      test: group.testable
        ? {
            running: testing === group.id,
            result: results[group.id] ?? null,
            onTest: async () => {
              setTesting(group.id);
              try {
                const check = await test(group.id).unwrap();
                setResults((current) => ({ ...current, [group.id]: { ...checkBadge(check), message: check.message } }));
              } catch (e) {
                message.error(apiErrorMessage(e));
              } finally {
                setTesting(null);
              }
            },
          }
        : null,
    };
  });

  return { status: 'ready', groups, secretsLocked: !data.canStoreSecrets };
};
