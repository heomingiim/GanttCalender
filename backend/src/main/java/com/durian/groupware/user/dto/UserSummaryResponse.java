package com.durian.groupware.user.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter  // MyBatis가 search 쿼리 결과를 resultType으로 채우려면 setter 필요
public class UserSummaryResponse {
    private Long id;
    private String employeeNumber;
    private String name;
    private Long departmentId;
    private String role;
    private String positionRank;

    public static UserSummaryResponse from(User user) {
        UserSummaryResponse res = new UserSummaryResponse();
        res.id = user.getId();
        res.employeeNumber = user.getEmployeeNumber();
        res.name = user.getName();
        res.departmentId = user.getDepartmentId();
        res.role = user.getRole();
        res.positionRank = user.getPositionRank();
        return res;
    }
}
