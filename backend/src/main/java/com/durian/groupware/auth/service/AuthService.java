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
