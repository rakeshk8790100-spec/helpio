import { MessagesSquare } from 'lucide-react';
import { useEffect, useRef } from 'react';

export interface ChatBubble {
  id: string;
  body: string;
  mine: boolean;
  /** e.g. "4:05 PM" */
  time: string;
}

interface Props {
  messages: ChatBubble[];
  /** Shown above the first message, e.g. a privacy note */
  intro?: string;
}

/** Chat bubbles, mine on the right; keeps the newest message in view as messages arrive. */
const ChatThread = ({ messages, intro }: Props) => {
  const end = useRef<HTMLDivElement>(null);
  const count = messages.length;

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [count]);

  return (
    <div role="log" aria-live="polite" className="flex flex-col gap-2">
      {intro && <div className="mx-auto mb-2 max-w-72 rounded-xl bg-amber-50 px-3 py-2 text-center text-[11px] text-amber-800">{intro}</div>}
      {count === 0 && (
        <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-slate-500">
          <MessagesSquare size={28} className="text-slate-300" />
          No messages yet. Say hello and share anything the pro should know.
        </div>
      )}
      {messages.map((m) => (
        <div key={m.id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
              m.mine ? 'rounded-br-md bg-indigo-600 text-white' : 'rounded-bl-md bg-slate-100 text-slate-900'
            }`}
          >
            <div className="whitespace-pre-line break-words">{m.body}</div>
            <div className={`mt-0.5 text-right text-[10px] ${m.mine ? 'text-white/70' : 'text-slate-500'}`}>{m.time}</div>
          </div>
        </div>
      ))}
      <div ref={end} />
    </div>
  );
};

export default ChatThread;
