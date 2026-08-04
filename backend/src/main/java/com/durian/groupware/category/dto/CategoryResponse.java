package com.durian.groupware.category.dto;

public record CategoryResponse(
    Long id,
    String name,
    String color,
    boolean team
) {
    public static CategoryResponse from(Category c) {
        return new CategoryResponse(
            c.getId(),
            c.getName(),
            c.getColor(),
            c.getDepartmentId() != null
        );
    }
}