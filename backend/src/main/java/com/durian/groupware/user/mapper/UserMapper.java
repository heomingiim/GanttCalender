package com.durian.groupware.user.mapper;

import com.durian.groupware.user.dto.User;
import com.durian.groupware.user.dto.UserSummaryResponse;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface UserMapper {
    User findById(Long id);
    User findByEmployeeNumber(String employeeNumber);
    List<User> findByDepartmentId(Long departmentId);
    List<UserSummaryResponse> search(@Param("keyword") String keyword,
                                     @Param("departmentId") Long departmentId);
    void insert(User user);
    void update(User user);
    int count();
}
