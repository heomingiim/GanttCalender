package com.durian.groupware.task.dto;

import java.time.LocalDateTime;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// activity_logs 테이블에 대응
@Getter
@Setter
@NoArgsConstructor
public class ActivityLog {
    private Long id;
    private Long taskId;
    private Long userId;          // 행동한 사람
    private String action;        // CREATE / UPDATE / DELETE / STATUS_CHANGE
    private LocalDateTime createdAt;
}