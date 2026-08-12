import client from './client';

// ── 알림 (백엔드 미구현 — NotificationController 추가 시 바로 동작) ──
export const listNotifications = () => client.get('/notifications');

/** 5초 폴링 대상. 응답: { count: 3 } */
export const getUnreadCount = () => client.get('/notifications/unread-count');

export const markAsRead = (id) => client.patch(`/notifications/${id}/read`);

export const markAllAsRead = () => client.patch('/notifications/read-all');

export const deleteNotification = (id) => client.delete(`/notifications/${id}`);
