package com.durian.groupware.category.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
public class Category {
    private Long id;
    private Long userId;        
    private Long departmentId;   
    private String name;
    private String color;        
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}