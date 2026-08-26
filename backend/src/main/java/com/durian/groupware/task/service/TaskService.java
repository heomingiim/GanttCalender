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
        if (loginUser.id().equals(task.getCreatorId())) return true;
        if ("EVENT".equals(task.getTaskType()) && !"MEMBER".equals(loginUser.role())) return true;
        if ("WBS_TASK".equals(task.getTaskType()) && task.getProjectId() != null
                && projectMemberService.isAdmin(loginUser.id(), task.getProjectId())) return true;
        return false;
    }

    private boolean canEditProgress(LoginUser loginUser, Task task) {
        return "WBS_TASK".equals(task.getTaskType())
                && assigneeMapper.findUserIdsByTaskId(task.getId()).contains(loginUser.id());
    }

    private boolean canView(LoginUser loginUser, Task task) {
        if (loginUser.id().equals(task.getCreatorId())) return true;
        if ("TODO".equals(task.getTaskType())) {
            return task.getProjectId() != null
                    && projectMemberService.isMember(loginUser.id(), task.getProjectId());
        }
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
            Task parent = taskMapper.findByIdNotDeleted(parentId);
            if (parent == null) throw new BusinessException(ErrorCode.PARENT_NOT_FOUND);
            if (!Objects.equals(parent.getProjectId(), task.getProjectId())) {
                throw new BusinessException(ErrorCode.PARENT_OTHER_PROJECT);
            }
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
                roots.add(map.get(t.getId()));
            }
        }
        return roots;
    }

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

    @Transactional
    public void replaceAssignees(LoginUser loginUser, Long taskId, List<Long> userIds) {
        Task target = getEditable(loginUser, taskId);
        if (!"WBS_TASK".equals(target.getTaskType())) throw new BusinessException(ErrorCode.INVALID_INPUT);

        taskMapper.lockForUpdate(taskId);
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

        taskMapper.lockForUpdate(taskId);
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
                notificationService.notifyNow(uid, taskId, "INVITE",
                        "'" + title + "' 일정의 필수 참석자로 변경되었습니다.");
            }
        }
    }

    public List<TaskParticipantResponse> getParticipants(LoginUser loginUser, Long taskId) {
        Task task = taskMapper.findByIdNotDeleted(taskId);
        if (task == null) throw new BusinessException(ErrorCode.TASK_NOT_FOUND);
        if (!canView(loginUser, task)) throw new BusinessException(ErrorCode.TASK_FORBIDDEN);
        return participantMapper.findByTaskId(taskId).stream().map(TaskParticipantResponse::from).toList();
    }

    public List<UserSummaryResponse> getAssignees(LoginUser loginUser, Long taskId) {
        Task task = taskMapper.findByIdNotDeleted(taskId);
        if (task == null) throw new BusinessException(ErrorCode.TASK_NOT_FOUND);
        if (!canView(loginUser, task)) throw new BusinessException(ErrorCode.TASK_FORBIDDEN);
        return assigneeMapper.findAssigneesByTaskId(taskId);
    }

    public void checkViewableForHistory(LoginUser loginUser, Long id) {
        Task task = taskMapper.findById(id);
        if (task == null) throw new BusinessException(ErrorCode.TASK_NOT_FOUND);
        if (!canView(loginUser, task)) throw new BusinessException(ErrorCode.TASK_FORBIDDEN);
    }

    @Transactional
    public void respondToInvite(LoginUser loginUser, Long taskId, String responseStatus) {
        if (!ALLOWED_RESPONSES.contains(responseStatus)) {
            throw new BusinessException(ErrorCode.INVALID_PARTICIPANT_RESPONSE);
        }
        int updated = participantMapper.updateResponse(taskId, loginUser.id(), responseStatus);
        if (updated == 0) throw new BusinessException(ErrorCode.NOT_PARTICIPANT);
    }
}
