package com.durian.groupware.auth.dto;
import com.durian.groupware.user.dto.User;


public record UserInfoResponse(
    Long id,
    String employeeNumber,
    String name,
    String role,
    String positionRank,
    Long departmentId,
    String departmentName,
    String email
) {
    public static UserInfoResponse from(User user, String departmentName) {
        return new UserInfoResponse(
            user.getId(),
            user.getEmployeeNumber(),
            user.getName(),
            user.getRole(),
            user.getPositionRank(),
            user.getDepartmentId(),
            departmentName,
            user.getEmail()
        );
    }
}
