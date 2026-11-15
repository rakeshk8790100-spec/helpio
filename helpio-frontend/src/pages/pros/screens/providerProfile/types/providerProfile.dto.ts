import type { ProviderProfile, WithStatus } from '@/common/CommonDto';

/* A pro's public profile: the layout's props. */

export interface RequestSheetProps {
  open: boolean;
  onClose: () => void;
  providerName: string;
  jobs: WithStatus<{ items: { id: string; title: string; meta: string }[] }>;
  selectedJobId: string | null;
  onSelectJob: (id: string) => void;
  message: string;
  onMessageChange: (value: string) => void;
  sending: boolean;
  error?: string;
  onSend: () => void;
  onPostNew: () => void;
}

export type ProviderProfileLayoutProps = WithStatus<{
  provider: ProviderProfile;
  /** e.g. "Mon–Sat, 9:00 AM–6:00 PM" */
  hours: string | null;
  onBack: () => void;
  /** Customers only; providers previewing their own profile see a note instead */
  request: (RequestSheetProps & { onOpen: () => void }) | null;
  isOwnProfile: boolean;
}>;
