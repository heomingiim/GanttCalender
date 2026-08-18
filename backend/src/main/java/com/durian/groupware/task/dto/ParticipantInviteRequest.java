package com.durian.groupware.task.dto;

import java.util.List;

// required가 null이면 false(선택 참석)로 처리
public record ParticipantInviteRequest(
    List<Long> userIds,
    Boolean required
) {}