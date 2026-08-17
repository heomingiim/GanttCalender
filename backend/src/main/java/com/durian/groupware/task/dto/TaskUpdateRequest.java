package com.durian.groupware.task.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDateTime;

// 수정 대상 필드만. 상태/진행률은 별도 PATCH 엔드포인트를 쓴다.
// 상위 작업(parentTaskId) 변경도 별도 — setParent 사용
public record TaskUpdateRequest(
    @NotBlank String title,
    String description,
    String deliverable,
    LocalDateTime startDate,
    LocalDateTime endDate,
    Boolean allDay,
    @NotBlank String visibility,
    @NotBlank String priority,
    Long categoryId
) {}
