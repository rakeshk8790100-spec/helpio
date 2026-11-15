import { useEffect, useRef, useState } from 'react';
import type { ComponentProps } from 'react';
import { useNavigate } from 'react-router-dom';
import type { NotificationBell } from '@/components/common';
import { baseApi, poll } from '@/config/base_service/base.api';
import { formatClock } from '@/lib/utils';
import { useGetNotificationsQuery, useGetUnreadCountQuery, useMarkAllNotificationsReadMutation, useMarkNotificationReadMutation } from '@/pages/notifications/notifications.api';
import { useAppDispatch } from '@/redux';

// How often the bell checks for news; chat polls faster on its own screen
const POLL_MS = 30_000;

/** Header bell: unread count (polled), the latest list when opened, and opening one marks it read. */
export const useNotifications = (): ComponentProps<typeof NotificationBell> => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);
  const { data: unread = 0 } = useGetUnreadCountQuery(undefined, poll(POLL_MS));
  const { data: items = [], isLoading } = useGetNotificationsQuery(undefined, { skip: !open });
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead] = useMarkAllNotificationsReadMutation();

  // A new notification usually means a job changed: refresh job screens too
  const lastUnread = useRef(unread);
  useEffect(() => {
    if (unread > lastUnread.current) dispatch(baseApi.util.invalidateTags(['Jobs', 'Milestones']));
    lastUnread.current = unread;
  }, [unread, dispatch]);

  return {
    unread,
    open,
    onOpenChange: setOpen,
    loading: isLoading,
    items: items.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      timeLabel: formatClock(n.createdAt),
      read: n.read,
      onOpen: () => {
        setOpen(false);
        if (!n.read) void markRead(n.id);
        if (n.link) void navigate(n.link);
      },
    })),
    onMarkAllRead: () => markAllRead(),
  };
};
