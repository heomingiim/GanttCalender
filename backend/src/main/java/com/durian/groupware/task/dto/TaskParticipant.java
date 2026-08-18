package com.durian.groupware.task.dto;

import java.time.LocalDateTime;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class TaskParticipant {
    private Long id;
    private Long taskId;
    private Long userId;
    private boolean required;         // 필수 참석 여부
    private String responseStatus;    // PENDING / ACCEPTED / DECLINED / TENTATIVE
    private LocalDateTime respondedAt;
    private LocalDateTime createdAt;
}