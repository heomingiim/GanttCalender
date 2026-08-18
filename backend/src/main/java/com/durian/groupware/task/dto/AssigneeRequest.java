package com.durian.groupware.task.dto;

import java.util.List;

public record AssigneeRequest(List<Long> userIds) {}