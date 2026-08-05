package com.durian.groupware.task.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

// PATCH /api/tasks/{id}/progress 의 body
public record TaskProgressRequest(
    @Min(0) @Max(100) int progressRate
) {}
