package com.durian.groupware.task.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.durian.groupware.task.dto.TaskParticipant;

@Mapper
public interface TaskParticipantMapper {
    List<TaskParticipant> findByTaskId(Long taskId);
    List<Long> findUserIdsByTaskId(Long taskId);
    void insertBatch(@Param("taskId") Long taskId,
                     @Param("userIds") List<Long> userIds,
                     @Param("required") boolean required);
    void updateResponse(@Param("taskId") Long taskId,
                        @Param("userId") Long userId,
                        @Param("responseStatus") String responseStatus);
}