package com.durian.groupware.task.dto;

// PATCH /api/tasks/{id}/parent 의 body
// parentTaskId가 null이면 상위 작업을 해제하고 최상위로 올린다 (그래서 @NotNull을 붙이지 않는다)
public record TaskParentRequest(Long parentTaskId) {}
