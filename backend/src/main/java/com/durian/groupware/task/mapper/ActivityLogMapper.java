package com.durian.groupware.task.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;

import com.durian.groupware.task.dto.ActivityLog;

@Mapper
public interface ActivityLogMapper {
    List<ActivityLog> findByTaskId(Long taskId);
    void insert(ActivityLog log);
}