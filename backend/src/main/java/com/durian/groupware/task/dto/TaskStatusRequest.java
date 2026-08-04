package com.durian.groupware.task.dto;

import jakarta.validation.constraints.NotNull;

// PATCH /api/tasks/{id}/status 의 body — TODO / IN_PROGRESS / DONE / CANCELLED
public record TaskStatusRequest(@NotNull String status) {}
