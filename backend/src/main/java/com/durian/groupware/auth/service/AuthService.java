package com.durian.groupware.auth.service;

import com.durian.groupware.auth.dto.UserInfoResponse;
import com.durian.groupware.department.dto.Department;
import com.durian.groupware.department.mapper.DepartmentMapper;
import com.durian.groupware.global.auth.exception.BusinessException;
import com.durian.groupware.global.auth.exception.ErrorCode;
import com.durian.groupware.user.dto.User;
import com.durian.groupware.user.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service @RequiredArgsConstructor
public class AuthService {

    private final UserMapper userMapper;
    private final DepartmentMapper departmentMapper;

    public User authenticate(String employeeNumber) {
        User user = userMapper.findByEmployeeNumber(employeeNumber);
        if (user == null) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }
        if (!user.isActive()) {
            throw new BusinessException(ErrorCode.USER_RESIGNED);
        }
        return user;
    }

    // 세션엔 id/이름/역할/부서id만 들어있어(LoginUser), 사이드바에 띄울 직급·부서명·이메일은
    // 매번 DB에서 다시 읽어야 한다. /me 와 /login 둘 다 이 메서드로 통일해
    // 두 응답이 같은 필드를 갖도록 맞춘다.
    public UserInfoResponse getUserInfo(Long userId) {
        User user = userMapper.findById(userId);
        if (user == null) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }
        return getUserInfo(user);
    }

    public UserInfoResponse getUserInfo(User user) {
        return UserInfoResponse.from(user, resolveDepartmentPath(user.getDepartmentId()));
    }

    // "브랜드팀"만 있으면 어느 부서 소속인지 알 수 없다. 상위로 올라가며
    // 이름을 모아 "마케팅부 브랜드팀"처럼 만든다. 맨 위 COMPANY 노드는
    // 모든 사용자에게 똑같이 붙어 정보가 없으므로 뺀다.
    private String resolveDepartmentPath(Long departmentId) {
        if (departmentId == null) {
            return null;
        }
        List<String> names = new ArrayList<>();
        Long current = departmentId;
        while (current != null) {
            Department dept = departmentMapper.findById(current);
            if (dept == null) {
                break;
            }
            if (!"COMPANY".equals(dept.getType())) {
                names.add(0, dept.getName());
            }
            current = dept.getParentId();
        }
        return names.isEmpty() ? null : String.join(" ", names);
    }
}
