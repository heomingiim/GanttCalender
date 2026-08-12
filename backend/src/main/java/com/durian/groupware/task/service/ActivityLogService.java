package com.durian.groupware.task.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.durian.groupware.task.dto.ActivityLog;
import com.durian.groupware.task.mapper.ActivityLogMapper;

import lombok.RequiredArgsConstructor;

@Service @RequiredArgsConstructor
public class ActivityLogService {

    private final ActivityLogMapper activityLogMapper;

    public void log(Long taskId, Long userId, String action) {
        ActivityLog log = new ActivityLog();
        log.setTaskId(taskId);
        log.setUserId(userId);
        log.setAction(action);
        activityLogMapper.insert(log);
    }

    public List<ActivityLog> getByTaskId(Long taskId) {
        return activityLogMapper.findByTaskId(taskId);
    }
}