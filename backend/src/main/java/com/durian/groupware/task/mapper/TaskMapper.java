package com.durian.groupware.task.mapper;

import java.time.LocalDateTime;
import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.durian.groupware.task.dto.Task;

@Mapper
public interface TaskMapper {

    Task findById(Long id);

    Task findByIdNotDeleted(Long id);

    List<Task> findByProjectId(Long projectId);

    void insert(Task task);

    void update(Task task);

    void softDelete(Long id);

    void changeStatus(@Param("id") Long id, @Param("status") String status,
            @Param("progressRate") int progressRate);

    void changeProgress(@Param("id") Long id, @Param("progressRate") int progressRate);

    List<Task> searchCalendar(@Param("userId") Long userId,
            @Param("deptIds") List<Long> deptIds,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("keyword") String keyword);

    List<Task> findMyTodos(@Param("userId") Long userId,
            @Param("status") String status,
            @Param("projectId") Long projectId,
            @Param("keyword") String keyword);

    List<Task> findAssignedTasks(@Param("userId") Long userId,
            @Param("status") String status,
            @Param("projectId") Long projectId,
            @Param("keyword") String keyword);

    void updateParent(@Param("id") Long id, @Param("parentTaskId") Long parentTaskId);

    List<Task> findByProjectIdNotDeleted(Long projectId);
}
