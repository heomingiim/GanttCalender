package com.durian.groupware.project.dto;

import jakarta.validation.constraints.NotNull;

public record MemberRoleRequest(@NotNull String role) {}