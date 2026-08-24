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
import com.durian.groupware.project.service.ProjectService;
import com.durian.groupware.task.dto.AssigneeNameRow;
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
    private final ProjectService projectService;

    private static final Map<String, String> STATUS_LABEL = Map.of(
            "TODO", "대기", "IN_PROGRESS", "진행중", "DONE", "완료", "CANCELLED", "취소");

    // task_participants.response_status에 허용되는 값
    private static final Set<String> ALLOWED_RESPONSES =
            Set.of("PENDING", "ACCEPTED", "DECLINED", "TENTATIVE");

    @Transactional
    public TaskResponse create(LoginUser loginUser, TaskCreateRequest req) {
        if (req.startDate() != null && req.endDate() != null
                && req.startDate().isAfter(req.endDate())) {
            throw new BusinessException(ErrorCode.INVALID_TASK_DATE);
        }
        checkWithinProjectRange(req.projectId(), req.startDate(), req.endDate());

        if ("WBS_TASK".equals(req.taskType()) && req.projectId() != null
                && !projectMemberService.isAdmin(loginUser.id(), req.projectId())) {
            throw new BusinessException(ErrorCode.TASK_FORBIDDEN);
        }

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
        if ("WBS_TASK".equals(req.taskType()) && req.projectId() != null) {
            // 팀/개인 구분은 프로젝트 생성 시 한 번만 정하고, 그 안의 단계·하위작업은 그대로 물려받는다
            Project project = projectMapper.findByIdNotDeleted(req.projectId());
            task.setVisibility(project != null ? project.getVisibility() : "PUBLIC");
        } else {
            task.setVisibility(req.visibility() != null ? req.visibility() : "PUBLIC");
        }
        task.setStatus(req.status() != null ? req.status() : "TODO");
        task.setPriority(req.priority() != null ? req.priority() : "MEDIUM");
        task.setProgressRate(0);

        taskMapper.insert(task);
        activityLogService.log(task.getId(), loginUser.id(), "CREATE");
        return TaskResponse.from(taskMapper.findByIdNotDeleted(task.getId()));
    }

    public TaskResponse get(LoginUser loginUser, Long id) {
        Task task = taskMapper.findByIdNotDeleted(id);
        if (task == null) {
            throw new BusinessException(ErrorCode.TASK_NOT_FOUND);
        }
        if (!canView(loginUser, task)) {
            throw new BusinessException(ErrorCode.TASK_FORBIDDEN);
        }
        boolean edit = canEdit(loginUser, task);
        return TaskResponse.from(task, edit, edit || canEditProgress(loginUser, task));
    }

    @Transactional
    public TaskResponse update(LoginUser loginUser, Long id, TaskUpdateRequest req) {
        Task task = getEditable(loginUser, id);

        if (req.startDate() != null && req.endDate() != null
                && req.startDate().isAfter(req.endDate())) {
            throw new BusinessException(ErrorCode.INVALID_TASK_DATE);
        }
        checkWithinProjectRange(task.getProjectId(), req.startDate(), req.endDate());

        boolean scheduleChanged = !Objects.equals(task.getStartDate(), req.startDate())
                || !Objects.equals(task.getEndDate(), req.endDate());
        boolean titleChanged = !Objects.equals(task.getTitle(), req.title());

        task.setTitle(req.title());
        task.setDescription(req.description());
        task.setDeliverable(req.deliverable());
        task.setStartDate(req.startDate());
        task.setEndDate(req.endDate());
        task.setAllDay(Boolean.TRUE.equals(req.allDay()));
        // WBS 작업의 구분(팀/개인)은 프로젝트에서 상속되므로 수정 폼에서 바꿀 수 없다
        if (!"WBS_TASK".equals(task.getTaskType())) {
            task.setVisibility(req.visibility());
        }
        task.setPriority(req.priority());
        task.setCategoryId(req.categoryId());
        taskMapper.update(task);
        activityLogService.log(id, loginUser.id(), "UPDATE");

        if (scheduleChanged || titleChanged) {
            notifyUpdateToRelated(task, loginUser.id());
        }

        return TaskResponse.from(taskMapper.findByIdNotDeleted(id));
    }

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
        syncProjectStatus(task);
    }

    @Transactional
    public TaskResponse changeStatus(LoginUser loginUser, Long id, String status) {
        Task task = getProgressEditable(loginUser, id);
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
            } else {
                notifyStatusChangeToAssignees(task, status, loginUser.id());
            }
        } else {
            taskMapper.changeProgress(id, progressRate);
        }

        syncProjectStatus(task);
        return TaskResponse.from(taskMapper.findByIdNotDeleted(id));
    }

    @Transactional
    public TaskResponse changeProgress(LoginUser loginUser, Long id, int rate) {
        Task task = getProgressEditable(loginUser, id);
        // 진행률에 맞춰 상태도 같이 맞춘다. 취소 상태는 진행률을 바꿔도 유지.
        // changeStatus는 상태가 실제로 바뀔 때만 행을 갱신하므로, 상태가 그대로인 채
        // 진행률만 바뀌는 경우(30%→60%)엔 changeProgress를 써야 한다.
        String status = "CANCELLED".equals(task.getStatus())
                ? task.getStatus()
                : rate <= 0 ? "TODO" : rate >= 100 ? "DONE" : "IN_PROGRESS";
        if (status.equals(task.getStatus())) {
            taskMapper.changeProgress(id, rate);
        } else {
            taskMapper.changeStatus(id, status, rate);
        }
        activityLogService.log(id, loginUser.id(), "PROGRESS_CHANGE");
        syncProjectStatus(task);
        return TaskResponse.from(taskMapper.findByIdNotDeleted(id));
    }

    private void syncProjectStatus(Task task) {
        if (task.getProjectId() != null && "WBS_TASK".equals(task.getTaskType())) {
            projectService.syncStatus(task.getProjectId());
        }
    }

    private void checkWithinProjectRange(Long projectId, LocalDateTime startDate, LocalDateTime endDate) {
        if (projectId == null) return;
        Project project = projectMapper.findByIdNotDeleted(projectId);
        if (project == null) return;
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

    private void notifyStatusChangeToAssignees(Task task, String status, Long editorId) {
        List<Long> assigneeIds = assigneeMapper.findUserIdsByTaskId(task.getId());
        String statusLabel = STATUS_LABEL.getOrDefault(status, status);
        for (Long uid : assigneeIds) {
            if (uid.equals(editorId)) continue;
            notificationService.notifyNow(uid, task.getId(), "STATUS_CHANGE",
                    "'" + task.getTitle() + "' 작업 상태가 '" + statusLabel + "'(으)로 변경되었습니다.");
        }
    }

    private void notifyUpdateToRelated(Task task, Long editorId) {
        Set<Long> targets = new HashSet<>(assigneeMapper.findUserIdsByTaskId(task.getId()));
        targets.addAll(participantMapper.findUserIdsByTaskId(task.getId()));
        targets.remove(editorId);
        for (Long uid : targets) {
            notificationService.notifyNow(uid, task.getId(), "UPDATE",
                    "'" + task.getTitle() + "' 일정 내용이 변경되었습니다.");
        }
    }

    private Task getEditable(LoginUser loginUser, Long id) {
        Task task = taskMapper.findByIdNotDeleted(id);
        if (task == null) throw new BusinessException(ErrorCode.TASK_NOT_FOUND);
        if (!canEdit(loginUser, task)) throw new BusinessException(ErrorCode.TASK_FORBIDDEN);
        return task;
    }

    // 상태·진행률만 바꾸는 경로는 담당자에게도 허용한다 (getEditable과의 차이)
    private Task getProgressEditable(LoginUser loginUser, Long id) {
        Task task = taskMapper.findByIdNotDeleted(id);
        if (task == null) throw new BusinessException(ErrorCode.TASK_NOT_FOUND);
        if (canEdit(loginUser, task)) return task;
        if ("WBS_TASK".equals(task.getTaskType())
                && assigneeMapper.findUserIdsByTaskId(id).contains(loginUser.id())) {
            return task;
        }
        throw new BusinessException(ErrorCode.TASK_FORBIDDEN);
    }

    private boolean canEdit(LoginUser loginUser, Task task) {
        if (loginUser.id().equals(task.getCreatorId())) return true; // 생성자 본인
        if ("EVENT".equals(task.getTaskType()) && !"MEMBER".equals(loginUser.role())) return true; // 팀 공용 EVENT는 팀장급 이상도 수정 가능
        if ("WBS_TASK".equals(task.getTaskType()) && task.getProjectId() != null
                && projectMemberService.isAdmin(loginUser.id(), task.getProjectId())) return true; // WBS는 프로젝트 관리자도 수정 가능
        return false;
    }

    // 담당자는 상태/진행률만 바꿀 수 있다
    private boolean canEditProgress(LoginUser loginUser, Task task) {
        return "WBS_TASK".equals(task.getTaskType())
                && assigneeMapper.findUserIdsByTaskId(task.getId()).contains(loginUser.id());
    }

    private boolean canView(LoginUser loginUser, Task task) {
        if (loginUser.id().equals(task.getCreatorId())) return true;
        if ("TODO".equals(task.getTaskType())) {
            // 프로젝트에 속한 투두는 멤버에게 공개, 개인 투두는 작성자 본인만
            return task.getProjectId() != null
                    && projectMemberService.isMember(loginUser.id(), task.getProjectId());
        }
        if ("WBS_TASK".equals(task.getTaskType())) {
            // visibility와 무관하게 프로젝트 멤버만 볼 수 있다.
            // PUBLIC이어도 프로젝트 밖 사람에게 새면 안 된다 — id만 알면 GET /api/tasks/{id}로 우회 조회 가능
            return task.getProjectId() != null
                    && projectMemberService.isMember(loginUser.id(), task.getProjectId());
        }
        return "PUBLIC".equals(task.getVisibility());
    }

    public List<TaskResponse> getCalendar(LoginUser loginUser,
            LocalDateTime from, LocalDateTime to,
            String scope, String keyword) {
        List<Long> deptIds = departmentService.resolveScopeDeptIds(loginUser, scope);
        List<Task> tasks = taskMapper.searchCalendar(loginUser.id(), deptIds, from, to, keyword);
        return tasks.stream().map(t -> TaskResponse.from(t, canEdit(loginUser, t))).toList();
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
                .map(t -> {
                    boolean edit = canEdit(loginUser, t);
                    return TaskResponse.from(t, edit, edit || canEditProgress(loginUser, t));
                })
                .toList();
    }

    @Transactional
    public void reorder(LoginUser loginUser, List<Long> ids) {
        if (ids == null || ids.isEmpty()) throw new BusinessException(ErrorCode.INVALID_INPUT);

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
            // 없는 id를 넘기면 parent_task_id FK 위반이 500으로 튀고,
            // 삭제된(is_deleted) 부모를 넘기면 이 작업이 조용히 고아가 된다.
            Task parent = taskMapper.findByIdNotDeleted(parentId);
            if (parent == null) throw new BusinessException(ErrorCode.PARENT_NOT_FOUND);
            // 다른 프로젝트의 작업을 부모로 두면 어느 쪽 트리에도 온전히 속하지 않는다
            if (!Objects.equals(parent.getProjectId(), task.getProjectId())) {
                throw new BusinessException(ErrorCode.PARENT_OTHER_PROJECT);
            }
            // 순환 검사: parentId의 조상들 중에 taskId가 있으면 안 됨
            if (isAncestor(taskId, parentId)) throw new BusinessException(ErrorCode.CIRCULAR_PARENT);
        }

        taskMapper.updateParent(taskId, parentId);
        activityLogService.log(taskId, loginUser.id(), "PARENT_CHANGE");
        return TaskResponse.from(taskMapper.findByIdNotDeleted(taskId));
    }

    private boolean isAncestor(Long targetId, Long startId) {
        Long current = startId;
        Set<Long> visited = new HashSet<>();
        while (current != null) {
            if (current.equals(targetId)) return true;
            if (visited.contains(current)) break;
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
        for (AssigneeNameRow row : assigneeMapper.findAssigneeNamesByProjectId(projectId)) {
            namesByTaskId.computeIfAbsent(row.taskId(), k -> new ArrayList<>()).add(row.name());
        }

        Map<Long, TaskTreeResponse> map = new LinkedHashMap<>();
        for (Task t : all) {
            TaskTreeResponse r = TaskTreeResponse.from(t, canEdit(loginUser, t));
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
                // 부모가 목록에 없는 경우(삭제됨/권한 없음/다른 프로젝트) → 최상위로 끌어올린다.
                // 여기서 버리면 하위 트리까지 화면에서 사라진다.
                roots.add(map.get(t.getId()));
            }
        }
        return roots;
    }

    // 투두 화면의 "삭제"는 이걸 호출한다 — 프로젝트 작업 자체는 지우지 않고 담당에서만 뺀다
    @Transactional
    public void unassignSelf(LoginUser loginUser, Long taskId) {
        Task task = taskMapper.findByIdNotDeleted(taskId);
        if (task == null) throw new BusinessException(ErrorCode.TASK_NOT_FOUND);
        if (!"WBS_TASK".equals(task.getTaskType())) throw new BusinessException(ErrorCode.INVALID_INPUT);
        if (!assigneeMapper.findUserIdsByTaskId(taskId).contains(loginUser.id())) {
            throw new BusinessException(ErrorCode.TASK_FORBIDDEN);
        }
        assigneeMapper.deleteByTaskAndUser(taskId, loginUser.id());
    }

    // ★ @Transactional 필수 ★ delete 후 insert가 실패하면(FK 위반 등)
    // 트랜잭션이 없으면 delete만 커밋되어 담당자가 0명인 채로 남는다.
    @Transactional
    public void replaceAssignees(LoginUser loginUser, Long taskId, List<Long> userIds) {
        Task target = getEditable(loginUser, taskId);
        if (!"WBS_TASK".equals(target.getTaskType())) throw new BusinessException(ErrorCode.INVALID_INPUT);

        // 동시 요청이 겹치면 "교체 전 명단" 조회가 서로 다른 시점을 보게 되어 중복 알림이 난다. 직렬화.
        taskMapper.lockForUpdate(taskId);

        // 이미 담당자인 사람에게 또 알림을 보내지 않기 위해 교체 전 명단을 기억해둔다
        Set<Long> before = new HashSet<>(assigneeMapper.findUserIdsByTaskId(taskId));

        List<Long> targets = (userIds != null) ? userIds.stream().distinct().toList() : List.of();
        assigneeMapper.deleteByTaskId(taskId);
        if (!targets.isEmpty()) {
            assigneeMapper.insertBatch(taskId, targets);
        }

        String title = taskMapper.findByIdNotDeleted(taskId).getTitle();
        Set<Long> targetSet = new HashSet<>(targets);
        for (Long uid : targets) {
            if (!before.contains(uid)) {
                notificationService.notifyNow(uid, taskId, "ASSIGN",
                        "'" + title + "' 작업의 담당자로 지정되었습니다.");
            }
        }
        for (Long uid : before) {
            if (!targetSet.contains(uid)) {
                notificationService.notifyNow(uid, taskId, "UNASSIGN",
                        "'" + title + "' 작업의 담당자에서 제외되었습니다.");
            }
        }
    }

    @Transactional
    public void inviteParticipants(LoginUser loginUser, Long taskId,
            List<Long> userIds, Boolean required) {
        Task task = taskMapper.findByIdNotDeleted(taskId);
        if (task == null) throw new BusinessException(ErrorCode.TASK_NOT_FOUND);
        if (!canView(loginUser, task)) throw new BusinessException(ErrorCode.TASK_FORBIDDEN);
        if ("TODO".equals(task.getTaskType())) throw new BusinessException(ErrorCode.INVALID_INPUT);
        if (userIds == null || userIds.isEmpty()) return;

        taskMapper.lockForUpdate(taskId); // replaceAssignees와 같은 이유로 직렬화

        // 기존 참석자를 "필수 여부까지" 기억해둔다 — 누가 새로 초대됐는지, 선택→필수로 바뀌었는지 구분해야
        // 초대 버튼을 다시 눌렀을 때 중복 알림이 가지 않는다.
        Map<Long, Boolean> beforeRequired = participantMapper.findByTaskId(taskId).stream()
                .collect(Collectors.toMap(TaskParticipant::getUserId, TaskParticipant::isRequired));

        List<Long> targets = userIds.stream().distinct().toList();
        boolean nowRequired = Boolean.TRUE.equals(required);

        participantMapper.insertBatch(taskId, targets, nowRequired);

        String title = taskMapper.findByIdNotDeleted(taskId).getTitle();
        for (Long uid : targets) {
            Boolean wasRequired = beforeRequired.get(uid);
            if (wasRequired == null) {
                if (task.getProjectId() != null) {
                    projectMemberService.ensureMember(uid, task.getProjectId());
                }
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

    public List<TaskParticipantResponse> getParticipants(LoginUser loginUser, Long taskId) {
        Task task = taskMapper.findByIdNotDeleted(taskId);
        if (task == null) throw new BusinessException(ErrorCode.TASK_NOT_FOUND);
        if (!canView(loginUser, task)) throw new BusinessException(ErrorCode.TASK_FORBIDDEN);
        return participantMapper.findByTaskId(taskId).stream().map(TaskParticipantResponse::from).toList();
    }

    // PUT /assignees가 전체 교체라, 화면이 현재 담당자를 먼저 읽어야 "모르는 사람을 실수로 지우는" 사고를 막을 수 있다.
    public List<UserSummaryResponse> getAssignees(LoginUser loginUser, Long taskId) {
        Task task = taskMapper.findByIdNotDeleted(taskId);
        if (task == null) throw new BusinessException(ErrorCode.TASK_NOT_FOUND);
        if (!canView(loginUser, task)) throw new BusinessException(ErrorCode.TASK_FORBIDDEN);
        return assigneeMapper.findAssigneesByTaskId(taskId);
    }

    // get()과 달리 findById로 삭제된 작업도 찾는다 — 삭제 직후 "DELETE" 이력이 is_deleted 필터에 걸려 404가 나는 문제를 막는다.
    public void checkViewableForHistory(LoginUser loginUser, Long id) {
        Task task = taskMapper.findById(id);
        if (task == null) throw new BusinessException(ErrorCode.TASK_NOT_FOUND);
        if (!canView(loginUser, task)) throw new BusinessException(ErrorCode.TASK_FORBIDDEN);
    }

    @Transactional
    public void respondToInvite(LoginUser loginUser, Long taskId, String responseStatus) {
        // @NotNull만으로는 아무 문자열이나 통과한다. VARCHAR(20)을 넘으면 DB에서 잘리거나 에러가 난다.
        if (!ALLOWED_RESPONSES.contains(responseStatus)) {
            throw new BusinessException(ErrorCode.INVALID_PARTICIPANT_RESPONSE);
        }
        int updated = participantMapper.updateResponse(taskId, loginUser.id(), responseStatus);
        // 참석자가 아니면 0건이 갱신된다. 그대로 200을 주면 호출자가 성공으로 오해한다.
        if (updated == 0) throw new BusinessException(ErrorCode.NOT_PARTICIPANT);
    }
}
