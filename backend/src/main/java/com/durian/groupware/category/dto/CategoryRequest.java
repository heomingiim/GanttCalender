package com.durian.groupware.category.dto;

import jakarta.validation.constraints.NotBlank;

// isTeam = true 면 팀 공용 카테고리 (팀장급 이상만 생성 가능)
public record CategoryRequest(
    @NotBlank String name,
    String color,
    boolean isTeam
) {}