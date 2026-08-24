package com.durian.groupware.task.dto;

import jakarta.validation.constraints.NotNull;

public record TaskStatusRequest(@NotNull String status) {}
