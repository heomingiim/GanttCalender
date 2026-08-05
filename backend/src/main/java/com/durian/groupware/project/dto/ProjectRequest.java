package com.durian.groupware.project.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;

public record ProjectRequest(
    @NotBlank String name,
    String description,
    LocalDate startDate,
    LocalDate endDate,
    String status          // PLANNED / IN_PROGRESS / DONE / ON_HOLD
) {}