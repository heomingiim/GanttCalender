import client from './client';

// ── 알림 ─────────────────────────────────────────────
export const listNotifications = () => client.get('/notifications');

/** 5초 폴링 대상. 응답: { count: 3 } */
export const getUnreadCount = () => client.get('/notifications/unread-count');

export const markAsRead = (id) => client.patch(`/notifications/${id}/read`);

export const markAllAsRead = () => client.patch('/notifications/read-all');

export const deleteNotification = (id) => client.delete(`/notifications/${id}`);

export const deleteAllNotifications = () => client.delete('/notifications');
