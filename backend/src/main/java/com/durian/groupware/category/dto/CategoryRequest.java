package com.durian.groupware.category.dto;

import jakarta.validation.constraints.NotBlank;

public record CategoryRequest(
    @NotBlank String name,
    String color,
    boolean isTeam
) {}