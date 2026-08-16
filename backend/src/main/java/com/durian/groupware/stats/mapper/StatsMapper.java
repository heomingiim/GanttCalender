package com.durian.groupware.stats.mapper;

import java.time.LocalDateTime;
import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.durian.groupware.stats.dto.StatRow;
import com.durian.groupware.task.dto.Task;

@Mapper
public interface StatsMapper {
    // deptIds가 비어 있으면(MY 스코프) userId 한 명만, 있으면(TEAM 스코프)
    // 그 부서들 소속 전원의 작업을 합쳐서 집계한다.
    List<StatRow> getStats(@Param("userId") Long userId,
                           @Param("deptIds") List<Long> deptIds,
                           @Param("from") LocalDateTime from,
                           @Param("to") LocalDateTime to,
                           @Param("unit") String unit);

    List<Task> findOpenTodos(Long userId);
    List<Task> findTodayEvents(Long userId);
    List<Task> findTodayWbsTasks(Long userId);
}
