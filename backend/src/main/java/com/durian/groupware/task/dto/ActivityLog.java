package com.durian.groupware.task.dto;

import java.time.LocalDateTime;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class ActivityLog {
    private Long id;
    private Long taskId;
    private Long userId;
    private String action;
    private LocalDateTime createdAt;
}