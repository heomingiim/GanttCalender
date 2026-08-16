package com.durian.groupware.task.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor
public class Task {
    private Long id;
    private Long projectId;
    private Long parentTaskId;
    private Long creatorId;
    private Long categoryId;
    private String taskType;   // TODO / EVENT / WBS_TASK / MILESTONE
    private String title;
    private String description;
    private String deliverable; // WBS 산출물
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private boolean allDay;
    private String visibility; // PUBLIC / PRIVATE
    private String status;     // TODO / IN_PROGRESS / DONE / CANCELLED
    private String priority;   // LOW / MEDIUM / HIGH
    private int progressRate;
    private boolean deleted;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}