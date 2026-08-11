package com.durian.groupware.task.dto;

import jakarta.validation.constraints.NotNull;

// ACCEPTED / DECLINED / TENTATIVE
public record ParticipantResponseRequest(@NotNull String responseStatus) {}