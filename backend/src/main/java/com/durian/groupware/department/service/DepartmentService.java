package com.durian.groupware.department.service;

import com.durian.groupware.department.dto.Department;
import com.durian.groupware.department.dto.DepartmentTreeResponse;
import com.durian.groupware.department.mapper.DepartmentMapper;
import com.durian.groupware.global.auth.LoginUser;
import com.durian.groupware.global.auth.exception.BusinessException;
import com.durian.groupware.global.auth.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DepartmentService {

    private final DepartmentMapper departmentMapper;

    // 전체 조직 목록을 한 번에 가져와서 메모리에서 트리로 조립
    public List<DepartmentTreeResponse> getTree() {
        List<Department> all = departmentMapper.findAll();

        // 1. id → Department 맵 만들기
        Map<Long, DepartmentTreeResponse> map = new LinkedHashMap<>();
        for (Department dept : all) {
            map.put(dept.getId(), DepartmentTreeResponse.from(dept));
        }

        // 2. 부모에 자식 붙이기
        List<DepartmentTreeResponse> roots = new ArrayList<>();
        for (Department dept : all) {
            if (dept.getParentId() == null) {
                roots.add(map.get(dept.getId()));
            } else {
                DepartmentTreeResponse parent = map.get(dept.getParentId());
                if (parent != null) {
                    parent.getChildren().add(map.get(dept.getId()));
                }
            }
        }
        return roots;
    }

    // 캘린더 조회 시 scope 계산: MY → 빈 리스트, TEAM → 내 팀 ID
    public List<Long> resolveScopeDeptIds(LoginUser loginUser, String scope) {
        if ("MY".equals(scope) || scope == null) {
            return List.of();
        }
        if ("TEAM".equals(scope)) {
            return List.of(loginUser.departmentId());
        }
        throw new BusinessException(ErrorCode.SCOPE_NOT_ALLOWED);
    }
}
