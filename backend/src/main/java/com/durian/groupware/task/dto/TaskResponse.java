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
    String deliverable,
    LocalDateTime startDate,
    LocalDateTime endDate,
    boolean allDay,
    String visibility,
    String status,
    String priority,
    int progressRate,
    LocalDateTime createdAt,
    LocalDateTime updatedAt,
    boolean canEdit,
    boolean canEditProgress
) {
    public static TaskResponse from(Task t) {
        return from(t, true, true);
    }

    public static TaskResponse from(Task t, boolean canEdit) {
        return from(t, canEdit, canEdit);
    }

    // canEdit: 제목/기간/삭제 등 전체 편집 권한 (작성자 · 관리자)
    // canEditProgress: 상태/진행률만 바꿀 수 있는 권한 (담당자 포함)
    public static TaskResponse from(Task t, boolean canEdit, boolean canEditProgress) {
        return new TaskResponse(
            t.getId(),
            t.getProjectId(),
            t.getParentTaskId(),
            t.getCreatorId(),
            t.getCategoryId(),
            t.getTaskType(),
            t.getTitle(),
            t.getDescription(),
            t.getDeliverable(),
            t.getStartDate(),
            t.getEndDate(),
            t.isAllDay(),
            t.getVisibility(),
            t.getStatus(),
            t.getPriority(),
            t.getProgressRate(),
            t.getCreatedAt(),
            t.getUpdatedAt(),
            canEdit,
            canEditProgress
        );
    }
}
