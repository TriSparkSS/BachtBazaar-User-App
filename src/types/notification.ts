export type AppNotification = {
  id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  readAt?: string | null;
  createdAt?: string;
  data?: Record<string, string | undefined>;
};

export type NotificationsPage = {
  unreadCount: number;
  total: number;
  page: number;
  totalPages: number;
  items: AppNotification[];
};
