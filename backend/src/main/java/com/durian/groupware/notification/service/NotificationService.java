package com.durian.groupware.notification.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.durian.groupware.notification.dto.Notification;
import com.durian.groupware.notification.dto.NotificationResponse;
import com.durian.groupware.notification.mapper.NotificationMapper;

import lombok.RequiredArgsConstructor;

@Service @RequiredArgsConstructor
public class NotificationService {

    private final NotificationMapper notificationMapper;

    public void notifyNow(Long userId, Long taskId, String type, String message) {
        Notification noti = new Notification();
        noti.setUserId(userId);
        noti.setTaskId(taskId);
        noti.setType(type);
        noti.setMessage(message);
        noti.setRead(false);
        notificationMapper.insert(noti);
    }

    public List<NotificationResponse> getMyNotifications(Long userId) {
        return notificationMapper.findByUserId(userId)
                .stream().map(NotificationResponse::from).toList();
    }

    public long getUnreadCount(Long userId) {
        return notificationMapper.countUnread(userId);
    }

    public void markAsRead(Long userId, Long notificationId) {
        notificationMapper.markAsRead(notificationId, userId);
    }

    public void markAllAsRead(Long userId) {
        notificationMapper.markAllAsRead(userId);
    }

    // 알림 삭제 — 본인 것만 지워지도록 userId를 함께 조건에 넣는다
    public void delete(Long userId, Long notificationId) {
        notificationMapper.deleteById(notificationId, userId);
    }

    public void deleteAll(Long userId) {
        notificationMapper.deleteAllByUserId(userId);
    }
}