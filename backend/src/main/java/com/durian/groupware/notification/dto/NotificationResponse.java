package com.durian.groupware.notification.dto;

import java.time.LocalDateTime;

public record NotificationResponse(
    Long id,
    Long taskId,
    String type,
    String message,
    boolean read,
    LocalDateTime createdAt
) {
    public static NotificationResponse from(Notification n) {
        return new NotificationResponse(
            n.getId(), n.getTaskId(), n.getType(),
            n.getMessage(), n.isRead(), n.getCreatedAt()
        );
    }
}