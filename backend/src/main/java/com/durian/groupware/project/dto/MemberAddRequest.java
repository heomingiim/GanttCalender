package com.durian.groupware.project.dto;

import jakarta.validation.constraints.NotNull;

public record MemberAddRequest(
    @NotNull Long userId,
    String role
) {}