package com.durian.groupware.task.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

// taskType: TODO / EVENT / WBS_TASK
// projectId, parentTaskId는 WBS 작업일 때만 사용 (일반 일정/투두는 null)
public record TaskCreateRequest(
    Long projectId,
    Long parentTaskId,
    Long categoryId,
    @NotNull String taskType,
    @NotBlank String title,
    String description,
    String deliverable,
    LocalDateTime startDate,
    LocalDateTime endDate,
    Boolean allDay,         // null이면 false로 처리
    String visibility,      // null이면 PUBLIC
    String status,          // null이면 TODO
    String priority         // null이면 MEDIUM
) {}
