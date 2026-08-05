package com.durian.groupware.department.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
public class Department {
    private Long id;
    private String name;
    private Long parentId;
    private String type;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
