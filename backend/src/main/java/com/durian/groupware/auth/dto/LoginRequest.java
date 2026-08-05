package com.durian.groupware.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
    @NotBlank String employeeNumber
) {}