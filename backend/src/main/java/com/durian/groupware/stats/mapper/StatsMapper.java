package com.durian.groupware.stats.mapper;

import java.time.LocalDateTime;
import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.durian.groupware.stats.dto.StatRow;
import com.durian.groupware.task.dto.Task;

@Mapper
public interface StatsMapper {
    List<StatRow> getStats(@Param("userId") Long userId,
                           @Param("from") LocalDateTime from,
                           @Param("to") LocalDateTime to,
                           @Param("unit") String unit);

    List<Task> findOpenTodos(Long userId);
    List<Task> findTodayEvents(Long userId);
}
