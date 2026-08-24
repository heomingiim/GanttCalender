package com.durian.groupware.department.service;

import com.durian.groupware.department.dto.Department;
import com.durian.groupware.department.dto.DepartmentTreeResponse;
import com.durian.groupware.department.mapper.DepartmentMapper;
import com.durian.groupware.global.auth.LoginUser;
import com.durian.groupware.global.auth.exception.BusinessException;
import com.durian.groupware.global.auth.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class DepartmentService {

    private final DepartmentMapper departmentMapper;

    public List<DepartmentTreeResponse> getTree() {
        // 전체 조직 목록을 한 번에 가져와서 메모리에서 트리로 조립
        List<Department> all = departmentMapper.findAll();

        Map<Long, DepartmentTreeResponse> map = new LinkedHashMap<>();
        for (Department dept : all) {
            map.put(dept.getId(), DepartmentTreeResponse.from(dept));
        }

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

    // 캘린더 조회 시 scope 계산: MY → 빈 리스트(= 본인만), TEAM → 내 소속 + 산하 조직 id 전체
    // 팀 소속이면 자기 팀 하나, 부서 직속(임원)이면 부서 + 산하 팀 전부가 잡힌다
    public List<Long> resolveScopeDeptIds(LoginUser loginUser, String scope) {
        if ("MY".equals(scope) || scope == null) {
            return List.of();
        }
        if ("TEAM".equals(scope)) {
            if (loginUser.departmentId() == null) {
                throw new BusinessException(ErrorCode.NO_DEPARTMENT);
            }
            return collectSubtreeIds(loginUser.departmentId());
        }
        throw new BusinessException(ErrorCode.SCOPE_NOT_ALLOWED);
    }

    private List<Long> collectSubtreeIds(Long rootId) {
        Map<Long, List<Long>> childrenByParent = new HashMap<>();
        for (Department dept : departmentMapper.findAll()) {
            if (dept.getParentId() != null) {
                childrenByParent
                        .computeIfAbsent(dept.getParentId(), k -> new ArrayList<>())
                        .add(dept.getId());
            }
        }

        Set<Long> collected = new LinkedHashSet<>();   // Set이라 순환 데이터여도 무한루프 없음
        Deque<Long> queue = new ArrayDeque<>();
        queue.add(rootId);
        while (!queue.isEmpty()) {
            Long current = queue.poll();
            if (collected.add(current)) {
                queue.addAll(childrenByParent.getOrDefault(current, List.of()));
            }
        }
        return new ArrayList<>(collected);
    }
}
