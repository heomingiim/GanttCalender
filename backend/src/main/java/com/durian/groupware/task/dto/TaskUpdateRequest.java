package com.durian.groupware.task.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

public record TaskUpdateRequest(
    @NotBlank String title,
    String description,
    String deliverable,
    @NotNull LocalDateTime startDate,
    @NotNull LocalDateTime endDate,
    Boolean allDay,
    @NotBlank String visibility,
    @NotBlank String priority,
    Long categoryId
) {}
