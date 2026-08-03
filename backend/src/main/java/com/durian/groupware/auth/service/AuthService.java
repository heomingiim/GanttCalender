package com.durian.groupware.auth.service;

import com.durian.groupware.global.auth.exception.BusinessException;
import com.durian.groupware.global.auth.exception.ErrorCode;
import com.durian.groupware.user.dto.User;
import com.durian.groupware.user.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service @RequiredArgsConstructor
public class AuthService {

    private final UserMapper userMapper;

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
}