package com.durian.groupware.task.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.durian.groupware.task.dto.AssigneeNameRow;
import com.durian.groupware.user.dto.UserSummaryResponse;

@Mapper
public interface TaskAssigneeMapper {
    List<Long> findUserIdsByTaskId(Long taskId);
    List<UserSummaryResponse> findAssigneesByTaskId(Long taskId);
    List<AssigneeNameRow> findAssigneeNamesByProjectId(Long projectId);
    void deleteByTaskId(Long taskId);
    void deleteByTaskAndUser(@Param("taskId") Long taskId, @Param("userId") Long userId);
    void insertBatch(@Param("taskId") Long taskId, @Param("userIds") List<Long> userIds);
}