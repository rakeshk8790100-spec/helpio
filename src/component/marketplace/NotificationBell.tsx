import { Badge, Popover, Spin } from 'antd';
import { Bell, BellOff } from 'lucide-react';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  /** e.g. "4:05 PM" */
  timeLabel: string;
  read: boolean;
  onOpen: () => void;
}

interface Props {
  unread: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  items: NotificationItem[];
  onMarkAllRead: () => void;
}

/** Header bell with an unread count; opens the latest notifications, unread ones highlighted. */
const NotificationBell = ({ unread, open, onOpenChange, loading, items, onMarkAllRead }: Props) => (
  <Popover
    open={open}
    onOpenChange={onOpenChange}
    trigger="click"
    placement="bottomRight"
    arrow={false}
    content={
      <div className="flex w-[300px] max-w-[calc(100vw-32px)] flex-col">
        <div className="flex items-center justify-between pb-2">
          <span className="text-sm font-semibold text-slate-900">Notifications</span>
          {unread > 0 && (
            <button type="button" onClick={onMarkAllRead} className="text-xs font-semibold text-indigo-600 active:scale-95">
              Mark all read
            </button>
          )}
        </div>
        {loading ? (
          <div className="flex justify-center py-6">
            <Spin size="small" />
          </div>
        ) : items.length ? (
          <div className="-mx-3 flex max-h-[60dvh] flex-col overflow-y-auto">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={item.onOpen}
                className={`flex gap-2 px-3 py-2.5 text-left active:bg-slate-100 ${item.read ? '' : 'bg-indigo-50/60'}`}
              >
                <span
                  aria-hidden
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.read ? 'bg-transparent' : 'bg-indigo-500'}`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-900">{item.title}</span>
                  <span className="mt-0.5 line-clamp-2 block text-xs text-slate-600">{item.body}</span>
                  <span className="mt-0.5 block text-[10px] text-slate-400">{item.timeLabel}</span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-6 text-center text-xs text-slate-500">
            <BellOff size={20} className="text-slate-400" />
            You're all caught up.
          </div>
        )}
      </div>
    }
  >
    <button
      type="button"
      aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
      className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 active:scale-95 active:bg-slate-100"
    >
      <Badge count={unread} size="small" overflowCount={9}>
        <Bell size={21} className="text-slate-600" />
      </Badge>
    </button>
  </Popover>
);

export default NotificationBell;
