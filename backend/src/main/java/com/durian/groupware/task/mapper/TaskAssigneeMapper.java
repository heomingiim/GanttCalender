package com.durian.groupware.task.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface TaskAssigneeMapper {
    List<Long> findUserIdsByTaskId(Long taskId);
    void deleteByTaskId(Long taskId);
    void insertBatch(@Param("taskId") Long taskId, @Param("userIds") List<Long> userIds);
}