package com.durian.groupware.auth.dto;
import com.durian.groupware.global.auth.LoginUser;
import com.durian.groupware.user.dto.User;


public record UserInfoResponse(
    Long id,
    String employeeNumber,
    String name,
    String role,
    Long departmentId
) {
    public static UserInfoResponse from(User user) {
        return new UserInfoResponse(
            user.getId(),
            user.getEmployeeNumber(),
            user.getName(),
            user.getRole(),
            user.getDepartmentId()
        );
    }

    public static UserInfoResponse fromLoginUser(LoginUser loginUser) {
        return new UserInfoResponse(
            loginUser.id(),
            loginUser.employeeNumber(),
            loginUser.name(),
            loginUser.role(),
            loginUser.departmentId()
        );
    }
}