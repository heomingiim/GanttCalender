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
    boolean canEdit
) {
    // canEdit을 모르거나 상관없는 자리(생성/수정 직후 응답 등 — 그 행위 자체가
    // 편집 권한을 이미 증명했으므로 true가 항상 맞다)에서 쓰는 기본형.
    public static TaskResponse from(Task t) {
        return from(t, true);
    }

    // 조회한 사람이 실제로 이 작업을 수정할 수 있는지는 볼 수 있는지(canView)와
    // 다르다. 프론트가 상태/진행률 컨트롤을 보여줄지 판단하려면 이 값이 필요하다
    // — 없으면 프로젝트 멤버가 볼 수는 있지만 못 고치는 작업에서 컨트롤을 만졌다가
    // 매번 403을 받고 나서야 알게 된다.
    public static TaskResponse from(Task t, boolean canEdit) {
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
            canEdit
        );
    }
}
