package com.durian.groupware.task.dto;

// parentTaskId가 null이면 최상위로 올린다 (@NotNull 없음)
public record TaskParentRequest(Long parentTaskId) {}
