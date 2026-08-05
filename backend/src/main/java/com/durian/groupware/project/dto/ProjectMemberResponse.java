package com.durian.groupware.project.dto;

// 멤버 목록 응답. users / departments를 JOIN해서 이름까지 한 번에 내려준다.
// (userId만 주면 프론트가 멤버 수만큼 사용자 조회를 또 해야 한다)
public record ProjectMemberResponse(
    Long id,
    Long projectId,
    Long userId,
    String userName,
    String departmentName,
    String role
) {}
