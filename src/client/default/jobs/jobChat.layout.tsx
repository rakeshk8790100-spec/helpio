import { Alert, Button, Input } from 'antd';
import { ArrowLeft, SendHorizontal } from 'lucide-react';
import { ChatThread } from '../../../component/marketplace';
import { AlertBanner, Avatar, PageSkeleton } from '../../../component/ui';
import type { JobChatLayoutProps } from './jobs.layout.types';

/** /jobs/:id/chat and /pro/jobs/:id/chat: chat about one job, with a sticky composer. */
const JobChatLayout = (p: JobChatLayoutProps) => {
  if (p.status === 'loading') return <PageSkeleton />;
  if (p.status === 'error') return <AlertBanner message={p.message} onRetry={p.onRetry} />;

  return (
    <div className="flex min-h-full flex-col">
      {/* Who and which job */}
      <div className="sticky -top-5 z-10 -mx-5 -mt-5 flex items-center gap-3 border-b border-slate-100 bg-white px-5 py-3">
        <button type="button" onClick={p.onBack} aria-label="Back to the job" className="rounded-full p-1 text-slate-600 active:scale-95">
          <ArrowLeft size={20} />
        </button>
        <Avatar name={p.otherName} src={p.otherAvatarUrl} size="sm" />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900">{p.otherName}</div>
          <div className="truncate text-xs text-slate-500">{p.title}</div>
        </div>
      </div>

      <div className="flex-1 py-4">
        <ChatThread messages={p.messages} intro="For your safety, phone numbers and emails are hidden. Keep chats on Helpio." />
      </div>

      {/* Composer */}
      <div className="sticky -bottom-5 -mx-5 -mb-5 border-t border-slate-100 bg-white px-5 py-3">
        {p.error && <Alert type="error" showIcon title={p.error} className="!mb-2" />}
        <div className="flex items-end gap-2">
          <Input.TextArea
            value={p.draft}
            onChange={(e) => p.onDraftChange(e.target.value)}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault();
                p.onSend();
              }
            }}
            autoSize={{ minRows: 1, maxRows: 4 }}
            maxLength={1000}
            placeholder={`Message ${p.otherName}`}
            aria-label="Message"
          />
          <Button
            type="primary"
            size="large"
            shape="circle"
            icon={<SendHorizontal size={18} />}
            loading={p.sending}
            disabled={!p.draft.trim()}
            onClick={p.onSend}
            aria-label="Send"
          />
        </div>
      </div>
    </div>
  );
};

export default JobChatLayout;
