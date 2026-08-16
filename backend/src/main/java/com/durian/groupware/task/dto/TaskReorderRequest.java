package com.durian.groupware.task.dto;

import java.util.List;

public record TaskReorderRequest(List<Long> ids) {
}
