import type { WithStatus } from '@/common/CommonDto';
import type { ChatBubble } from '@/components/common';

/* The jobChat screen: wire shapes and layout props. */

export interface ChatApiDto {
  job_id: string;
  job_title: string;
  other_name: string;
  other_avatar_url: string | null;
  messages: { id: string; body: string; mine: boolean; sender_name: string; created_at: string }[];
}

export type JobChatLayoutProps = WithStatus<{
  title: string;
  otherName: string;
  otherAvatarUrl: string | null;
  messages: ChatBubble[];
  draft: string;
  onDraftChange: (value: string) => void;
  sending: boolean;
  error?: string;
  onSend: () => void;
  onBack: () => void;
}>;
