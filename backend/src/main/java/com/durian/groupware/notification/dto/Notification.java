package com.durian.groupware.notification.dto;

import java.time.LocalDateTime;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// notifications 테이블에 대응
@Getter
@Setter
@NoArgsConstructor
public class Notification {
    private Long id;
    private Long userId;          // 수신자
    private Long taskId;          // 관련 작업 (없으면 null)
    private String type;          // ASSIGN / INVITE / CANCEL / DEADLINE
    private String message;
    private boolean read;         // DB 컬럼명: is_read → XML ResultMap으로 매핑
    private LocalDateTime readAt;
    private LocalDateTime createdAt;
}