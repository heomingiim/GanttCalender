package com.durian.groupware.task.dto;

import java.time.LocalDateTime;

public record TaskResponse(
    Long id,
    Long projectId,
    Long parentTaskId,
    Long creatorId,
    Long categoryId,
    String taskType,
    String title,
    String description,
    LocalDateTime startDate,
    LocalDateTime endDate,
    boolean allDay,
    String visibility,
    String status,
    String priority,
    int progressRate,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    public static TaskResponse from(Task t) {
        return new TaskResponse(
            t.getId(),
            t.getProjectId(),
            t.getParentTaskId(),
            t.getCreatorId(),
            t.getCategoryId(),
            t.getTaskType(),
            t.getTitle(),
            t.getDescription(),
            t.getStartDate(),
            t.getEndDate(),
            t.isAllDay(),
            t.getVisibility(),
            t.getStatus(),
            t.getPriority(),
            t.getProgressRate(),
            t.getCreatedAt(),
            t.getUpdatedAt()
        );
    }
}
