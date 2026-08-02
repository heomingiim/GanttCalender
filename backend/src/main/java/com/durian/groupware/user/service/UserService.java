package com.durian.groupware.user.service;

import com.durian.groupware.global.auth.exception.BusinessException;
import com.durian.groupware.global.auth.exception.ErrorCode;
import com.durian.groupware.user.dto.User;
import com.durian.groupware.user.dto.UserProfileResponse;
import com.durian.groupware.user.dto.UserSummaryResponse;
import com.durian.groupware.user.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserMapper userMapper;

    public UserProfileResponse getProfile(Long id) {
        User user = userMapper.findById(id);
        if (user == null) throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        return UserProfileResponse.from(user);
    }

    public List<UserSummaryResponse> findByDepartmentId(Long departmentId) {
        return userMapper.findByDepartmentId(departmentId)
                .stream().map(UserSummaryResponse::from).toList();
    }

    public List<UserSummaryResponse> search(String keyword, Long departmentId) {
        return userMapper.search(keyword, departmentId);
    }
}
