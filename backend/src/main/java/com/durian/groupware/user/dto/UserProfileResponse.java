package com.durian.groupware.user.dto;

import lombok.Getter;

import java.time.LocalDate;

@Getter
public class UserProfileResponse {
    private Long id;
    private String employeeNumber;
    private String name;
    private Long departmentId;
    private String role;
    private String positionRank;
    private String email;
    private String phone;
    private LocalDate hireDate;
    private String contractType;

    public static UserProfileResponse from(User user) {
        UserProfileResponse res = new UserProfileResponse();
        res.id = user.getId();
        res.employeeNumber = user.getEmployeeNumber();
        res.name = user.getName();
        res.departmentId = user.getDepartmentId();
        res.role = user.getRole();
        res.positionRank = user.getPositionRank();
        res.email = user.getEmail();
        res.phone = user.getPhone();
        res.hireDate = user.getHireDate();
        res.contractType = user.getContractType();
        return res;
    }
}
