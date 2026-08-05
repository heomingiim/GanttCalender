package com.durian.groupware.project.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// projects 테이블에 대응
@Getter
@Setter
@NoArgsConstructor
public class Project {
    private Long id;
    private String name;
    private String description;
    private Long ownerId;         // 생성자
    private LocalDate startDate;
    private LocalDate endDate;
    private String status;        // PLANNED / IN_PROGRESS / DONE / ON_HOLD
    private boolean deleted;      // DB 컬럼명: is_deleted → XML ResultMap으로 매핑
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}