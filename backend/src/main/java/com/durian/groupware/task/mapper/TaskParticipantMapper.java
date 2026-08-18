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
    // 갱신된 행 수를 돌려준다 — 0이면 참석자가 아니라는 뜻이라 서비스에서 걸러낸다
    int updateResponse(@Param("taskId") Long taskId,
                       @Param("userId") Long userId,
                       @Param("responseStatus") String responseStatus);
}