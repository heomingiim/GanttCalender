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

    // 갱신된 행 수를 돌려준다. status가 기존 값과 같으면 WHERE에 걸려 0을 반환하는데,
    // changeStatus()가 이걸로 "실제로 상태가 바뀌었는지"를 원자적으로 판단한다
    // (동시 요청이 둘 다 취소 알림을 중복 발송하지 않도록).
    int changeStatus(@Param("id") Long id, @Param("status") String status,
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

    // 담당자/참석자 교체 직전에 이 작업 행을 잠근다. 동시에 두 요청이 같은 작업의
    // 담당자를 바꾸면 "교체 전 명단" 조회가 서로 겹쳐 중복 알림·유실 갱신이 생기는데,
    // 이 잠금으로 두 번째 요청이 첫 번째가 커밋될 때까지 기다리게 만들어 막는다.
    void lockForUpdate(Long id);
}
