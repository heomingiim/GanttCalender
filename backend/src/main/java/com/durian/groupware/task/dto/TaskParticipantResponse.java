package com.durian.groupware.task.dto;

import java.time.LocalDateTime;

public record TaskParticipantResponse(
    Long id,
    Long taskId,
    Long userId,
    boolean required,
    String responseStatus,
    LocalDateTime respondedAt
) {
    public static TaskParticipantResponse from(TaskParticipant p) {
        return new TaskParticipantResponse(
            p.getId(), p.getTaskId(), p.getUserId(),
            p.isRequired(), p.getResponseStatus(), p.getRespondedAt()
        );
    }
}