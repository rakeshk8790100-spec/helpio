import type { WithStatus } from '@/common/CommonDto';
import type { BadgeTone } from '@/components/ui/StatusBadge';

/* The appSettings admin screen: its layout's props. */

export interface SettingFieldView {
  key: string;
  label: string;
  help: string;
  kind: 'text' | 'secret' | 'int' | 'bool';
  /** What the input shows: the draft, or the value in force (secrets: empty, see placeholder) */
  value: string;
  placeholder?: string;
  source: { label: string; tone: BadgeTone };
  unreadable: boolean;
  onChange: (value: string) => void;
  /** Saved here: go back to the .env value */
  onReset?: () => void;
}

export interface SettingGroupView {
  id: string;
  title: string;
  description: string;
  fields: SettingFieldView[];
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  test: { running: boolean; result: { label: string; tone: BadgeTone; message: string } | null; onTest: () => void } | null;
}

export type SettingsLayoutProps = WithStatus<{
  groups: SettingGroupView[];
  /** No SETTINGS_ENCRYPTION_KEY on the server: secrets can't be saved here */
  secretsLocked: boolean;
}>;
