package com.durian.groupware.stats.dto;

import java.util.List;

import com.durian.groupware.task.dto.TaskResponse;

public record DashboardResponse(
    List<TaskResponse> todayTodos,
    List<TaskResponse> todayEvents,
    List<TaskResponse> todayWbsTasks,
    List<TaskResponse> overdueWbsTasks
) {}
