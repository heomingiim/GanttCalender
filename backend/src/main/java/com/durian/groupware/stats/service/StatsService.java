package com.durian.groupware.stats.service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;

import com.durian.groupware.department.service.DepartmentService;
import com.durian.groupware.global.auth.LoginUser;
import com.durian.groupware.global.auth.exception.BusinessException;
import com.durian.groupware.global.auth.exception.ErrorCode;
import com.durian.groupware.stats.dto.DashboardResponse;
import com.durian.groupware.stats.dto.StatsResponse;
import com.durian.groupware.stats.dto.StatRow;
import com.durian.groupware.stats.mapper.StatsMapper;
import com.durian.groupware.task.dto.TaskResponse;
import com.durian.groupware.task.service.TaskService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class StatsService {

    private final StatsMapper statsMapper;
    private final DepartmentService departmentService;
    private final TaskService taskService;

    private static final Set<String> UNITS = Set.of("DAY", "WEEK", "MONTH");
    private static final long MAX_DAYS = 366;

    public StatsResponse getPersonalStats(LoginUser loginUser, String unit,
            LocalDate from, LocalDate to, String scope) {

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

        // 캘린더 팀 스코프와 같은 방식: MY면 빈 리스트(= 본인만), TEAM이면 부서 id들
        List<Long> deptIds = departmentService.resolveScopeDeptIds(loginUser, scope);

        List<StatRow> rows = statsMapper.getStats(
                loginUser.id(),
                deptIds,
                resolvedFrom.atStartOfDay(),
                resolvedTo.atTime(23, 59, 59),
                resolvedUnit
        );

        Map<String, Long> statusCounts = new LinkedHashMap<>();
        long total = 0;
        for (StatRow row : rows) {
            // status가 null인 행은 빈 구간을 표시하기 위한 0건짜리 자리 채우기 행이다
            if (row.getStatus() == null) continue;
            statusCounts.merge(row.getStatus(), row.getCount(), Long::sum);
            total += row.getCount();
        }

        return new StatsResponse(
                resolvedUnit, resolvedFrom, resolvedTo, total, statusCounts, rows
        );
    }

    public DashboardResponse getDashboard(LoginUser loginUser) {
        LocalDate today = LocalDate.now();
        // 오늘이 시작~마감 기간에 포함된 것만 "오늘 할 일"로 친다 (마감일만 오늘인 것으로 한정하지 않는다)
        // WBS 작업은 아래 wbsTasks에서 따로 보여주므로 여기서는 순수 투두만 남긴다
        List<TaskResponse> todos = taskService.getMyTodos(loginUser, null, null, null,
                        null, today.atTime(23, 59, 59)).stream()
                .filter(t -> "TODO".equals(t.taskType()))
                .filter(t -> !"DONE".equals(t.status()) && !"CANCELLED".equals(t.status()))
                .limit(10)
                .toList();
        List<TaskResponse> events = statsMapper.findTodayEvents(loginUser.id())
                .stream().map(TaskResponse::from).toList();
        List<TaskResponse> wbsTasks = statsMapper.findTodayWbsTasks(loginUser.id())
                .stream().map(TaskResponse::from).toList();
        return new DashboardResponse(todos, events, wbsTasks);
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
