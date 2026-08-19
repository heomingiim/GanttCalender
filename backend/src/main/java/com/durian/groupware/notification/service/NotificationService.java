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

    // 즉시 알림 생성 (담당자 지정, 일정 취소 등 발생 시 바로 호출)
    public void notifyNow(Long userId, Long taskId, String type, String message) {
        Notification noti = new Notification();
        noti.setUserId(userId);
        noti.setTaskId(taskId);
        noti.setType(type);
        noti.setMessage(message);
        noti.setRead(false);
        notificationMapper.insert(noti);
    }

    // 내 알림 목록
    public List<NotificationResponse> getMyNotifications(Long userId) {
        return notificationMapper.findByUserId(userId)
                .stream().map(NotificationResponse::from).toList();
    }

    // 안 읽은 알림 개수 (프론트에서 5초마다 폴링)
    public long getUnreadCount(Long userId) {
        return notificationMapper.countUnread(userId);
    }

    // 읽음 처리
    public void markAsRead(Long userId, Long notificationId) {
        notificationMapper.markAsRead(notificationId, userId);
    }

    // 전체 읽음
    public void markAllAsRead(Long userId) {
        notificationMapper.markAllAsRead(userId);
    }

    // 알림 삭제 — 본인 것만 지워지도록 userId를 함께 조건에 넣는다
    public void delete(Long userId, Long notificationId) {
        notificationMapper.deleteById(notificationId, userId);
    }

    // 전체 삭제
    public void deleteAll(Long userId) {
        notificationMapper.deleteAllByUserId(userId);
    }
}