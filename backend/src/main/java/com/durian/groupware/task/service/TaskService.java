package com.durian.groupware.task.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;

import com.durian.groupware.department.service.DepartmentService;
import com.durian.groupware.global.auth.LoginUser;
import com.durian.groupware.global.auth.exception.BusinessException;
import com.durian.groupware.global.auth.exception.ErrorCode;
import com.durian.groupware.notification.service.NotificationService;
import com.durian.groupware.task.dto.Task;
import com.durian.groupware.task.dto.TaskCreateRequest;
import com.durian.groupware.task.dto.TaskParticipantResponse;
import com.durian.groupware.task.dto.TaskResponse;
import com.durian.groupware.task.dto.TaskTreeResponse;
import com.durian.groupware.task.dto.TaskUpdateRequest;
import com.durian.groupware.task.mapper.TaskAssigneeMapper;
import com.durian.groupware.task.mapper.TaskMapper;
import com.durian.groupware.task.mapper.TaskParticipantMapper;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskMapper taskMapper;
    private final DepartmentService departmentService;
    private final TaskAssigneeMapper assigneeMapper;
    private final TaskParticipantMapper participantMapper;
    private final NotificationService notificationService;
    private final ActivityLogService activityLogService;

    // 생성
    public TaskResponse create(LoginUser loginUser, TaskCreateRequest req) {
        // 날짜 유효성 검사
        if (req.startDate() != null && req.endDate() != null
                && req.startDate().isAfter(req.endDate())) {
            throw new BusinessException(ErrorCode.INVALID_TASK_DATE);
        }

        Task task = new Task();
        task.setCreatorId(loginUser.id());
        task.setProjectId(req.projectId());
        task.setParentTaskId(req.parentTaskId());
        task.setCategoryId(req.categoryId());
        task.setTaskType(req.taskType());
        task.setTitle(req.title());
        task.setDescription(req.description());
        task.setStartDate(req.startDate());
        task.setEndDate(req.endDate());
        task.setAllDay(Boolean.TRUE.equals(req.allDay()));
        task.setVisibility(req.visibility() != null ? req.visibility() : "PUBLIC");
        task.setStatus(req.status() != null ? req.status() : "TODO");
        task.setPriority(req.priority() != null ? req.priority() : "MEDIUM");
        task.setProgressRate(0);

        taskMapper.insert(task);
        activityLogService.log(task.getId(), loginUser.id(), "CREATE");
        return TaskResponse.from(taskMapper.findByIdNotDeleted(task.getId()));
    }

    // 조회 (권한 체크 포함)
    public TaskResponse get(LoginUser loginUser, Long id) {
        Task task = taskMapper.findByIdNotDeleted(id);
        if (task == null) {
            throw new BusinessException(ErrorCode.TASK_NOT_FOUND);
        }
        if (!canView(loginUser, task)) {
            throw new BusinessException(ErrorCode.TASK_FORBIDDEN);
        }
        return TaskResponse.from(task);
    }

    // 수정
    public TaskResponse update(LoginUser loginUser, Long id, TaskUpdateRequest req) {
        Task task = getEditable(loginUser, id);

        if (req.startDate() != null && req.endDate() != null
                && req.startDate().isAfter(req.endDate())) {
            throw new BusinessException(ErrorCode.INVALID_TASK_DATE);
        }

        task.setTitle(req.title());
        task.setDescription(req.description());
        task.setStartDate(req.startDate());
        task.setEndDate(req.endDate());
        task.setAllDay(Boolean.TRUE.equals(req.allDay()));
        task.setVisibility(req.visibility());
        task.setPriority(req.priority());
        task.setCategoryId(req.categoryId());
        taskMapper.update(task);
        activityLogService.log(id, loginUser.id(), "UPDATE");

        return TaskResponse.from(taskMapper.findByIdNotDeleted(id));
    }

    // 삭제 (소프트)
    public void delete(LoginUser loginUser, Long id) {
        Task task = getEditable(loginUser, id);

        // 삭제 전에 참석자들에게 취소 알림 발송
        notifyCancelToParticipants(task);

        taskMapper.softDelete(id);
        activityLogService.log(id, loginUser.id(), "DELETE");
    }

    // 상태 변경 — 상태와 진행률을 함께 동기화
    public TaskResponse changeStatus(LoginUser loginUser, Long id, String status) {
        Task task = getEditable(loginUser, id);
        int progressRate = task.getProgressRate();

        if ("DONE".equals(status)) {
            progressRate = 100;
        } else if ("TODO".equals(status)) {
            progressRate = 0;
        }
        // IN_PROGRESS / CANCELLED는 진행률 그대로 유지

        taskMapper.changeStatus(id, status, progressRate);
        activityLogService.log(id, loginUser.id(), "STATUS_CHANGE");

        // task는 변경 전 값이라, 이미 취소 상태였으면 알림을 다시 보내지 않는다
        if ("CANCELLED".equals(status) && !"CANCELLED".equals(task.getStatus())) {
            notifyCancelToParticipants(task);
        }

        return TaskResponse.from(taskMapper.findByIdNotDeleted(id));
    }

    // 진행률 변경 (상태 변경은 changeStatus 사용)
    public TaskResponse changeProgress(LoginUser loginUser, Long id, int rate) {
        Task task = getEditable(loginUser, id);
        taskMapper.changeProgress(id, rate);
        return TaskResponse.from(taskMapper.findByIdNotDeleted(id));
    }

    // ============ 내부 유틸 ============
    private void notifyCancelToParticipants(Task task) {
        List<Long> participantIds = participantMapper.findUserIdsByTaskId(task.getId());
        for (Long uid : participantIds) {
            notificationService.notifyNow(uid, task.getId(), "CANCEL",
                    "'" + task.getTitle() + "' 일정이 취소되었습니다.");
        }
    }

    private Task getEditable(LoginUser loginUser, Long id) {
        Task task = taskMapper.findByIdNotDeleted(id);
        if (task == null) {
            throw new BusinessException(ErrorCode.TASK_NOT_FOUND);
        }
        if (!canEdit(loginUser, task)) {
            throw new BusinessException(ErrorCode.TASK_FORBIDDEN);
        }
        return task;
    }

    private boolean canEdit(LoginUser loginUser, Task task) {
        // 생성자 본인이면 수정 가능
        if (loginUser.id().equals(task.getCreatorId())) {
            return true;
        }
        // 팀 공용 EVENT는 팀장급 이상도 수정 가능
        if ("EVENT".equals(task.getTaskType()) && !"MEMBER".equals(loginUser.role())) {
            return true;
        }
        return false;
    }

    private boolean canView(LoginUser loginUser, Task task) {
        if (loginUser.id().equals(task.getCreatorId())) {
            return true;
        }
        if ("TODO".equals(task.getTaskType())) {
            return false; // 투두는 본인만

        }
        return "PUBLIC".equals(task.getVisibility());
    }

    public List<TaskResponse> getCalendar(LoginUser loginUser,
            LocalDateTime from, LocalDateTime to,
            String scope, String keyword) {
        List<Long> deptIds = departmentService.resolveScopeDeptIds(loginUser, scope);

        List<Task> tasks = taskMapper.searchCalendar(
                loginUser.id(), deptIds, from, to, keyword
        );
        return tasks.stream().map(TaskResponse::from).toList();
    }

    public List<TaskResponse> getMyTodos(LoginUser loginUser, String status,
            Long projectId, String keyword) {
        List<Task> tasks = taskMapper.findMyTodos(loginUser.id(), status, projectId, keyword);
        return tasks.stream().map(TaskResponse::from).toList();
    }

    public TaskResponse setParent(LoginUser loginUser, Long taskId, Long parentId) {
        Task task = getEditable(loginUser, taskId);

        if (parentId != null) {
            // 순환 검사: parentId의 조상들 중에 taskId가 있으면 안 됨
            if (isAncestor(taskId, parentId)) {
                throw new BusinessException(ErrorCode.CIRCULAR_PARENT);
            }
        }

        taskMapper.updateParent(taskId, parentId);
        return TaskResponse.from(taskMapper.findByIdNotDeleted(taskId));
    }

// parentId 위로 올라가면서 targetId가 있는지 확인
    private boolean isAncestor(Long targetId, Long startId) {
        Long current = startId;
        Set<Long> visited = new HashSet<>();
        while (current != null) {
            if (current.equals(targetId)) {
                return true;
            }
            if (visited.contains(current)) {
                break; // 안전장치

            }
            visited.add(current);
            Task t = taskMapper.findByIdNotDeleted(current);
            current = (t != null) ? t.getParentTaskId() : null;
        }
        return false;
    }

    public List<TaskTreeResponse> getProjectTree(Long projectId) {
        List<Task> all = taskMapper.findByProjectIdNotDeleted(projectId);

        Map<Long, TaskTreeResponse> map = new LinkedHashMap<>();
        for (Task t : all) {
            map.put(t.getId(), TaskTreeResponse.from(t));
        }

        List<TaskTreeResponse> roots = new ArrayList<>();
        for (Task t : all) {
            if (t.getParentTaskId() == null) {
                roots.add(map.get(t.getId()));
            } else {
                TaskTreeResponse parent = map.get(t.getParentTaskId());
                if (parent != null) {
                    parent.getChildren().add(map.get(t.getId()));
                }
            }
        }
        return roots;
    }

    public void replaceAssignees(LoginUser loginUser, Long taskId, List<Long> userIds) {
        getEditable(loginUser, taskId); // 권한 확인
        assigneeMapper.deleteByTaskId(taskId);
        if (userIds != null && !userIds.isEmpty()) {
            assigneeMapper.insertBatch(taskId, userIds);
            // 제목을 루프 밖에서 한 번만 조회 (N+1 방지)
            String title = taskMapper.findByIdNotDeleted(taskId).getTitle();
            for (Long uid : userIds) {
                notificationService.notifyNow(uid, taskId, "ASSIGN",
                        "'" + title + "' 작업의 담당자로 지정되었습니다.");
            }
        }
    }

    public void inviteParticipants(LoginUser loginUser, Long taskId,
            List<Long> userIds, Boolean required) {
        getEditable(loginUser, taskId); // 권한 확인
        if (userIds == null || userIds.isEmpty()) {
            return;
        }

        participantMapper.insertBatch(taskId, userIds, Boolean.TRUE.equals(required));

        String title = taskMapper.findByIdNotDeleted(taskId).getTitle();
        for (Long uid : userIds) {
            notificationService.notifyNow(uid, taskId, "INVITE",
                    "'" + title + "' 일정에 초대되었습니다.");
        }
    }

// 참석자 목록
    public List<TaskParticipantResponse> getParticipants(LoginUser loginUser, Long taskId) {
        Task task = taskMapper.findByIdNotDeleted(taskId);
        if (task == null) {
            throw new BusinessException(ErrorCode.TASK_NOT_FOUND);
        }
        if (!canView(loginUser, task)) {
            throw new BusinessException(ErrorCode.TASK_FORBIDDEN);
        }

        return participantMapper.findByTaskId(taskId)
                .stream().map(TaskParticipantResponse::from).toList();
    }

// 내 응답 변경 — 본인 응답만 바꾸므로 편집 권한은 필요 없다
    public void respondToInvite(LoginUser loginUser, Long taskId, String responseStatus) {
        participantMapper.updateResponse(taskId, loginUser.id(), responseStatus);
    }
}
