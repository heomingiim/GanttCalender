package com.durian.groupware.task.mapper;

import com.durian.groupware.task.dto.Task;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface TaskMapper {
    Task findById(Long id);
    Task findByIdNotDeleted(Long id);
    List<Task> findByProjectId(Long projectId);
    void insert(Task task);
    void update(Task task);
    void softDelete(Long id);        // is_deleted = true
    void changeStatus(@Param("id") Long id, @Param("status") String status,
                      @Param("progressRate") int progressRate);
    void changeProgress(@Param("id") Long id, @Param("progressRate") int progressRate);
}