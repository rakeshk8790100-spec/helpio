import type { AppNotification } from '../../common/CommonDto';
import { baseApi } from '../../config/base_service/base.api';

/* Wire format of /notifications */
interface NotificationApiDto {
  id: string;
  type: string;
  title: string;
  body: string;
  job_id: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

interface UnreadCountApiDto {
  unread_count: number;
}

const toNotification = (dto: NotificationApiDto): AppNotification => ({
  id: dto.id,
  type: dto.type,
  title: dto.title,
  body: dto.body,
  jobId: dto.job_id,
  link: dto.link,
  read: dto.read,
  createdAt: dto.created_at,
});

/** In-app notifications (the header bell), for customers and providers. */
export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query<AppNotification[], void>({
      query: () => ({ url: '/notifications', params: { limit: 30 } }),
      transformResponse: (dto: { notifications: NotificationApiDto[] }) => dto.notifications.map(toNotification),
      providesTags: ['Notifications'],
    }),
    getUnreadCount: builder.query<number, void>({
      query: () => '/notifications/unread-count',
      transformResponse: (dto: UnreadCountApiDto) => dto.unread_count,
      providesTags: ['Notifications'],
    }),
    markNotificationRead: builder.mutation<number, string>({
      query: (id) => ({ url: `/notifications/${id}/read`, method: 'POST' }),
      transformResponse: (dto: UnreadCountApiDto) => dto.unread_count,
      invalidatesTags: ['Notifications'],
    }),
    markAllNotificationsRead: builder.mutation<number, void>({
      query: () => ({ url: '/notifications/read-all', method: 'POST' }),
      transformResponse: (dto: UnreadCountApiDto) => dto.unread_count,
      invalidatesTags: ['Notifications'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} = notificationsApi;
