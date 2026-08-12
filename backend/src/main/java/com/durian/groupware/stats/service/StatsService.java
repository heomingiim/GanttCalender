package com.durian.groupware.stats.service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;

import com.durian.groupware.global.auth.exception.BusinessException;
import com.durian.groupware.global.auth.exception.ErrorCode;
import com.durian.groupware.stats.dto.StatsResponse;
import com.durian.groupware.stats.dto.StatRow;
import com.durian.groupware.stats.mapper.StatsMapper;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class StatsService {

    private final StatsMapper statsMapper;

    private static final Set<String> UNITS = Set.of("DAY", "WEEK", "MONTH");
    private static final long MAX_DAYS = 366;

    public StatsResponse getPersonalStats(Long userId, String unit,
            LocalDate from, LocalDate to) {

        String resolvedUnit = (unit == null || unit.isBlank())
                ? "MONTH"
                : unit.trim().toUpperCase();
        if (!UNITS.contains(resolvedUnit)) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }

        LocalDate resolvedTo = (to != null) ? to : LocalDate.now();
        LocalDate resolvedFrom = (from != null) ? from : defaultFrom(resolvedUnit, resolvedTo);

        if (resolvedFrom.isAfter(resolvedTo)) {
            throw new BusinessException(ErrorCode.INVALID_TASK_DATE);
        }
        if (resolvedFrom.plusDays(MAX_DAYS).isBefore(resolvedTo)) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }

        List<StatRow> rows = statsMapper.getStats(
                userId,
                resolvedFrom.atStartOfDay(),
                resolvedTo.atTime(23, 59, 59),
                resolvedUnit
        );

        Map<String, Long> statusCounts = new LinkedHashMap<>();
        long total = 0;
        for (StatRow row : rows) {
            statusCounts.merge(row.getStatus(), row.getCount(), Long::sum);
            total += row.getCount();
        }

        return new StatsResponse(
                resolvedUnit, resolvedFrom, resolvedTo, total, statusCounts, rows
        );
    }

    // from을 안 주면 단위에 맞는 기본 구간을 잡는다
    private LocalDate defaultFrom(String unit, LocalDate to) {
        return switch (unit) {
            case "DAY" -> to.minusDays(29);
            case "WEEK" -> to.minusWeeks(7).with(DayOfWeek.MONDAY);
            default -> to.withDayOfMonth(1).minusMonths(5);
        };
    }
}
