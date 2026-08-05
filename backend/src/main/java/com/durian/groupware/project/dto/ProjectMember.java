package com.durian.groupware.project.dto;

import java.time.LocalDateTime;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class ProjectMember {
    private Long id;
    private Long projectId;
    private Long userId;
    private String role;          // ADMIN / MEMBER
    private LocalDateTime createdAt;
}