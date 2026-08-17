package com.durian.groupware.task.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.durian.groupware.department.service.DepartmentService;
import com.durian.groupware.global.auth.LoginUser;
import com.durian.groupware.global.auth.exception.BusinessException;
import com.durian.groupware.global.auth.exception.ErrorCode;
import com.durian.groupware.notification.service.NotificationService;
import com.durian.groupware.project.dto.Project;
import com.durian.groupware.project.mapper.ProjectMapper;
import com.durian.groupware.project.service.ProjectMemberService;
import com.durian.groupware.task.dto.Task;
import com.durian.groupware.task.dto.TaskCreateRequest;
import com.durian.groupware.task.dto.TaskParticipant;
import com.durian.groupware.task.dto.TaskParticipantResponse;
import com.durian.groupware.task.dto.TaskResponse;
import com.durian.groupware.task.dto.TaskTreeResponse;
import com.durian.groupware.task.dto.TaskUpdateRequest;
import com.durian.groupware.task.mapper.TaskAssigneeMapper;
import com.durian.groupware.task.mapper.TaskMapper;
import com.durian.groupware.task.mapper.TaskParticipantMapper;
import com.durian.groupware.user.dto.UserSummaryResponse;

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
    private final ProjectMemberService projectMemberService;
    private final ProjectMapper projectMapper;

    // task_participants.response_status에 허용되는 값
    private static final Set<String> ALLOWED_RESPONSES =
            Set.of("PENDING", "ACCEPTED", "DECLINED", "TENTATIVE");

    // 생성
    @Transactional
    public TaskResponse create(LoginUser loginUser, TaskCreateRequest req) {
        // 날짜 유효성 검사
        if (req.startDate() != null && req.endDate() != null
                && req.startDate().isAfter(req.endDate())) {
            throw new BusinessException(ErrorCode.INVALID_TASK_DATE);
        }
        checkWithinProjectRange(req.projectId(), req.startDate(), req.endDate());

        Task task = new Task();
        task.setCreatorId(loginUser.id());
        task.setProjectId(req.projectId());
        task.setParentTaskId(req.parentTaskId());
        task.setCategoryId(req.categoryId());
        task.setTaskType(req.taskType());
        task.setTitle(req.title());
        task.setDescription(req.description());
        task.setDeliverable(req.deliverable());
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
        return TaskResponse.from(task, canEdit(loginUser, task));
    }

    // 수정
    @Transactional
    public TaskResponse update(LoginUser loginUser, Long id, TaskUpdateRequest req) {
        Task task = getEditable(loginUser, id);

        if (req.startDate() != null && req.endDate() != null
                && req.startDate().isAfter(req.endDate())) {
            throw new BusinessException(ErrorCode.INVALID_TASK_DATE);
        }
        checkWithinProjectRange(task.getProjectId(), req.startDate(), req.endDate());

        task.setTitle(req.title());
        task.setDescription(req.description());
        task.setDeliverable(req.deliverable());
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
    @Transactional
    public void delete(LoginUser loginUser, Long id) {
        Task task = getEditable(loginUser, id);

        // 삭제 전에 참석자들에게 취소 알림 발송. 이미 취소 상태였다면
        // changeStatus에서 이미 한 번 보냈을 것이므로 중복 발송하지 않는다.
        if (!"CANCELLED".equals(task.getStatus())) {
            notifyCancelToParticipants(task);
        }

        taskMapper.softDelete(id);
        activityLogService.log(id, loginUser.id(), "DELETE");
    }

    // 상태 변경 — 상태와 진행률을 함께 동기화
    @Transactional
    public TaskResponse changeStatus(LoginUser loginUser, Long id, String status) {
        Task task = getEditable(loginUser, id);
        int progressRate = task.getProgressRate();

        if ("DONE".equals(status)) {
            progressRate = 100;
        } else if ("TODO".equals(status)) {
            progressRate = 0;
        }
        // IN_PROGRESS / CANCELLED는 진행률 그대로 유지

        int updated = taskMapper.changeStatus(id, status, progressRate);

        if (updated > 0) {
            activityLogService.log(id, loginUser.id(), "STATUS_CHANGE");
            if ("CANCELLED".equals(status)) {
                notifyCancelToParticipants(task);
            }
        }

        return TaskResponse.from(taskMapper.findByIdNotDeleted(id));
    }

    // 진행률 변경 (상태 변경은 changeStatus 사용)
    @Transactional
    public TaskResponse changeProgress(LoginUser loginUser, Long id, int rate) {
        getEditable(loginUser, id);
        taskMapper.changeProgress(id, rate);
        activityLogService.log(id, loginUser.id(), "PROGRESS_CHANGE");
        return TaskResponse.from(taskMapper.findByIdNotDeleted(id));
    }

    // ============ 내부 유틸 ============

    private void checkWithinProjectRange(Long projectId, LocalDateTime startDate, LocalDateTime endDate) {
        if (projectId == null) {
            return;
        }
        Project project = projectMapper.findByIdNotDeleted(projectId);
        if (project == null) {
            return;
        }
        boolean startOutOfRange = startDate != null
                && (project.getStartDate() != null && startDate.toLocalDate().isBefore(project.getStartDate())
                    || project.getEndDate() != null && startDate.toLocalDate().isAfter(project.getEndDate()));
        boolean endOutOfRange = endDate != null
                && (project.getStartDate() != null && endDate.toLocalDate().isBefore(project.getStartDate())
                    || project.getEndDate() != null && endDate.toLocalDate().isAfter(project.getEndDate()));
        if (startOutOfRange || endOutOfRange) {
            throw new BusinessException(ErrorCode.TASK_DATE_OUT_OF_PROJECT_RANGE);
        }
    }

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
        // 프로젝트에 속한 투두는 프로젝트 멤버에게 공개(WBS/간트에서 보이도록),
        // 프로젝트가 없는 개인 투두는 작성자 본인만 볼 수 있다.
        if ("TODO".equals(task.getTaskType())) {
            return task.getProjectId() != null
                    && projectMemberService.isMember(loginUser.id(), task.getProjectId());
        }
        // WBS 작업은 visibility와 무관하게 프로젝트 멤버만 볼 수 있다.
        // PUBLIC이어도 프로젝트 밖 사람에게 새면 안 된다 — getProjectTree의
        // 멤버십 필터와 어긋나서, id만 알면 GET /api/tasks/{id}로 우회 조회가 가능해진다.
        if ("WBS_TASK".equals(task.getTaskType())) {
            return task.getProjectId() != null
                    && projectMemberService.isMember(loginUser.id(), task.getProjectId());
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

    private static final List<String> PRIORITY_ORDER = List.of("HIGH", "MEDIUM", "LOW");

    public List<TaskResponse> getMyTodos(LoginUser loginUser, String status,
            Long projectId, String keyword, LocalDateTime from, LocalDateTime to) {
        List<Task> todos = taskMapper.findMyTodos(loginUser.id(), status, projectId, keyword, from, to);
        List<Task> assigned = taskMapper.findAssignedTasks(loginUser.id(), status, projectId, keyword, from, to);
        return Stream.concat(todos.stream(), assigned.stream())
                .sorted(Comparator.comparingInt(Task::getSortOrder)
                        .thenComparingInt(t -> PRIORITY_ORDER.indexOf(t.getPriority()))
                        .thenComparing(t -> t.getEndDate() == null ? LocalDateTime.MAX : t.getEndDate())
                        .thenComparing(Task::getId))
                .map(t -> TaskResponse.from(t, canEdit(loginUser, t)))
                .toList();
    }

    @Transactional
    public void reorder(LoginUser loginUser, List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }

        Map<Long, Task> tasks = taskMapper.findByIdsNotDeleted(ids).stream()
                .collect(Collectors.toMap(Task::getId, t -> t));

        for (Long id : ids) {
            Task task = tasks.get(id);
            if (task == null || !canEdit(loginUser, task)) {
                throw new BusinessException(ErrorCode.TASK_FORBIDDEN);
            }
        }

        int order = 0;
        for (Long id : ids) {
            taskMapper.updateSortOrder(id, order++);
        }
    }

    @Transactional
    public TaskResponse setParent(LoginUser loginUser, Long taskId, Long parentId) {
        Task task = getEditable(loginUser, taskId);

        if (parentId != null) {
            // 부모 존재 확인.
            // 없는 id를 그대로 넘기면 parent_task_id FK 위반이 500으로 튀고,
            // 삭제된(is_deleted) 부모를 넘기면 이 작업이 조용히 고아가 된다.
            Task parent = taskMapper.findByIdNotDeleted(parentId);
            if (parent == null) {
                throw new BusinessException(ErrorCode.PARENT_NOT_FOUND);
            }
            // 다른 프로젝트의 작업을 부모로 두면 어느 쪽 트리에도 온전히 속하지 않는다
            if (!Objects.equals(parent.getProjectId(), task.getProjectId())) {
                throw new BusinessException(ErrorCode.PARENT_OTHER_PROJECT);
            }
            // 순환 검사: parentId의 조상들 중에 taskId가 있으면 안 됨
            if (isAncestor(taskId, parentId)) {
                throw new BusinessException(ErrorCode.CIRCULAR_PARENT);
            }
        }

        taskMapper.updateParent(taskId, parentId);
        activityLogService.log(taskId, loginUser.id(), "PARENT_CHANGE");
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

    public List<TaskTreeResponse> getProjectTree(LoginUser loginUser, Long projectId) {
        boolean isMember = projectMemberService.isMember(loginUser.id(), projectId);
        List<Task> all = taskMapper.findByProjectIdNotDeleted(projectId).stream()
                .filter(t -> "WBS_TASK".equals(t.getTaskType()))
                .filter(t -> isMember || loginUser.id().equals(t.getCreatorId()))
                .toList();

        Map<Long, List<String>> namesByTaskId = new LinkedHashMap<>();
        for (Map<String, Object> row : assigneeMapper.findAssigneeNamesByProjectId(projectId)) {
            Long taskId = ((Number) row.get("taskId")).longValue();
            namesByTaskId.computeIfAbsent(taskId, k -> new ArrayList<>()).add((String) row.get("name"));
        }

        Map<Long, TaskTreeResponse> map = new LinkedHashMap<>();
        for (Task t : all) {
            TaskTreeResponse r = TaskTreeResponse.from(t);
            r.setAssigneeNames(String.join(", ", namesByTaskId.getOrDefault(t.getId(), List.of())));
            map.put(t.getId(), r);
        }

        List<TaskTreeResponse> roots = new ArrayList<>();
        for (Task t : all) {
            TaskTreeResponse parent = (t.getParentTaskId() == null)
                    ? null
                    : map.get(t.getParentTaskId());

            if (parent != null) {
                parent.getChildren().add(map.get(t.getId()));
            } else {
                // 최상위이거나, 부모가 이 목록에 없는 경우(삭제됨 / 볼 권한 없음 / 다른 프로젝트).
                // 여기서 버리면 하위 트리까지 화면에서 사라지므로 최상위로 끌어올린다.
                roots.add(map.get(t.getId()));
            }
        }
        return roots;
    }

    // 담당자 전체 교체.
    // ★ @Transactional 필수 ★ delete 후 insert가 실패하면(존재하지 않는 user_id로 FK 위반 등)
    // 트랜잭션이 없을 때는 delete만 커밋되어 담당자가 0명인 채로 남는다.
    @Transactional
    public void replaceAssignees(LoginUser loginUser, Long taskId, List<Long> userIds) {
        getEditable(loginUser, taskId); // 권한 확인

        // 동시에 같은 작업의 담당자를 바꾸는 요청이 겹치면, 아래 "교체 전 명단" 조회가
        // 서로 다른 시점을 보게 되어 중복 알림·유실 갱신이 난다. 행을 잠가 직렬화한다.
        taskMapper.lockForUpdate(taskId);

        // 이미 담당자인 사람에게 또 알림을 보내지 않기 위해 교체 전 명단을 기억해둔다
        Set<Long> before = new HashSet<>(assigneeMapper.findUserIdsByTaskId(taskId));

        assigneeMapper.deleteByTaskId(taskId);
        if (userIds != null && !userIds.isEmpty()) {
            // 같은 사람이 두 번 들어오면 UNIQUE(task_id, user_id) 위반이 난다
            List<Long> targets = userIds.stream().distinct().toList();
            assigneeMapper.insertBatch(taskId, targets);

            // 제목을 루프 밖에서 한 번만 조회 (N+1 방지)
            String title = taskMapper.findByIdNotDeleted(taskId).getTitle();
            for (Long uid : targets) {
                if (before.contains(uid)) {
                    continue; // 원래 담당자였던 사람은 새 지정이 아니다
                }
                notificationService.notifyNow(uid, taskId, "ASSIGN",
                        "'" + title + "' 작업의 담당자로 지정되었습니다.");
            }
        }
    }

    @Transactional
    public void inviteParticipants(LoginUser loginUser, Long taskId,
            List<Long> userIds, Boolean required) {
        getEditable(loginUser, taskId); // 권한 확인
        if (userIds == null || userIds.isEmpty()) {
            return;
        }

        taskMapper.lockForUpdate(taskId); // replaceAssignees와 같은 이유로 직렬화

        // 기존 참석자를 "필수 여부까지" 기억해둔다.
        // 누가 새로 초대됐는지, 누가 선택 → 필수로 바뀌었는지 구분해야
        // 초대 버튼을 다시 눌렀을 때 중복 알림이 가지 않는다.
        Map<Long, Boolean> beforeRequired = participantMapper.findByTaskId(taskId).stream()
                .collect(Collectors.toMap(TaskParticipant::getUserId,
                        TaskParticipant::isRequired));

        List<Long> targets = userIds.stream().distinct().toList();
        boolean nowRequired = Boolean.TRUE.equals(required);

        participantMapper.insertBatch(taskId, targets, nowRequired);

        String title = taskMapper.findByIdNotDeleted(taskId).getTitle();
        for (Long uid : targets) {
            Boolean wasRequired = beforeRequired.get(uid);

            if (wasRequired == null) {
                notificationService.notifyNow(uid, taskId, "INVITE",
                        "'" + title + "' 일정에 초대되었습니다.");
            } else if (nowRequired && !wasRequired) {
                // 이미 참석자지만 선택 → 필수로 승격됐다. 알릴 만한 변화다.
                notificationService.notifyNow(uid, taskId, "INVITE",
                        "'" + title + "' 일정의 필수 참석자로 변경되었습니다.");
            }
            // 그 외(변화 없음, 필수 → 선택)는 알리지 않는다
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

    // 담당자 목록 — PUT /assignees가 전체 교체라, 화면이 현재 담당자를 먼저 읽어야
    // "안 보이는 사람을 실수로 지우는" 사고를 막을 수 있다.
    public List<UserSummaryResponse> getAssignees(LoginUser loginUser, Long taskId) {
        Task task = taskMapper.findByIdNotDeleted(taskId);
        if (task == null) {
            throw new BusinessException(ErrorCode.TASK_NOT_FOUND);
        }
        if (!canView(loginUser, task)) {
            throw new BusinessException(ErrorCode.TASK_FORBIDDEN);
        }
        return assigneeMapper.findAssigneesByTaskId(taskId);
    }

    // 활동 이력 조회 권한 확인. get()과 달리 findById로 삭제된 작업도 찾는다 —
    // 삭제 직후 "DELETE" 이력을 못 보게 되는 문제(is_deleted 필터에 걸려 404)를 막는다.
    public void checkViewableForHistory(LoginUser loginUser, Long id) {
        Task task = taskMapper.findById(id);
        if (task == null) {
            throw new BusinessException(ErrorCode.TASK_NOT_FOUND);
        }
        if (!canView(loginUser, task)) {
            throw new BusinessException(ErrorCode.TASK_FORBIDDEN);
        }
    }

// 내 응답 변경 — 본인 응답만 바꾸므로 편집 권한은 필요 없다
    @Transactional
    public void respondToInvite(LoginUser loginUser, Long taskId, String responseStatus) {
        // @NotNull만으로는 아무 문자열이나 통과한다. 화면은 코드값을 그대로 렌더링하고,
        // VARCHAR(20)을 넘으면 DB에서 잘리거나 에러가 난다.
        if (!ALLOWED_RESPONSES.contains(responseStatus)) {
            throw new BusinessException(ErrorCode.INVALID_PARTICIPANT_RESPONSE);
        }

        int updated = participantMapper.updateResponse(taskId, loginUser.id(), responseStatus);
        if (updated == 0) {
            // 참석자가 아니면 0건이 갱신된다. 그대로 200을 주면 호출자가 성공으로 오해한다.
            throw new BusinessException(ErrorCode.NOT_PARTICIPANT);
        }
    }
}
