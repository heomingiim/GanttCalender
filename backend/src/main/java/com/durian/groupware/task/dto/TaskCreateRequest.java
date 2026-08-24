package com.durian.groupware.task.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

public record TaskCreateRequest(
    Long projectId,
    Long parentTaskId,
    Long categoryId,
    @NotNull String taskType,
    @NotBlank String title,
    String description,
    String deliverable,
    @NotNull LocalDateTime startDate,
    @NotNull LocalDateTime endDate,
    Boolean allDay,
    String visibility,
    String status,
    String priority
) {}
