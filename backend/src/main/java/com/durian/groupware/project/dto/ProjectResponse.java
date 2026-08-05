package com.durian.groupware.project.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record ProjectResponse(
    Long id,
    String name,
    String description,
    Long ownerId,
    LocalDate startDate,
    LocalDate endDate,
    String status,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    public static ProjectResponse from(Project p) {
        return new ProjectResponse(
            p.getId(),
            p.getName(),
            p.getDescription(),
            p.getOwnerId(),
            p.getStartDate(),
            p.getEndDate(),
            p.getStatus(),
            p.getCreatedAt(),
            p.getUpdatedAt()
        );
    }
}