package com.durian.groupware.stats.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public record StatsResponse(
    String unit,                       // DAY / WEEK / MONTH
    LocalDate from,
    LocalDate to,
    long total,
    Map<String, Long> statusCounts,
    List<StatRow> rows
) {}
