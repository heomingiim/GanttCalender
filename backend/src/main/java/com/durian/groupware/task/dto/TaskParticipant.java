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
    private boolean required;
    private String responseStatus;
    private LocalDateTime respondedAt;
    private LocalDateTime createdAt;
}