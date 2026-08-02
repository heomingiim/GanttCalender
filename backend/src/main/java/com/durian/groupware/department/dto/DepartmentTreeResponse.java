package com.durian.groupware.department.dto;

import lombok.Getter;

import java.util.ArrayList;
import java.util.List;

@Getter
public class DepartmentTreeResponse {
    private Long id;
    private String name;
    private String type;
    private List<DepartmentTreeResponse> children = new ArrayList<>();

    public static DepartmentTreeResponse from(Department dept) {
        DepartmentTreeResponse res = new DepartmentTreeResponse();
        res.id = dept.getId();
        res.name = dept.getName();
        res.type = dept.getType();
        return res;
    }
}
