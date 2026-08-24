package com.durian.groupware.task.controller;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.durian.groupware.global.auth.Login;
import com.durian.groupware.global.auth.LoginUser;
import com.durian.groupware.global.auth.exception.BusinessException;
import com.durian.groupware.global.auth.exception.ErrorCode;
import com.durian.groupware.task.dto.ActivityLog;
import com.durian.groupware.task.dto.AssigneeRequest;
import com.durian.groupware.user.dto.UserSummaryResponse;
import com.durian.groupware.task.dto.ParticipantInviteRequest;
import com.durian.groupware.task.dto.ParticipantResponseRequest;
import com.durian.groupware.task.dto.TaskCreateRequest;
import com.durian.groupware.task.dto.TaskParentRequest;
import com.durian.groupware.task.dto.TaskParticipantResponse;
import com.durian.groupware.task.dto.TaskProgressRequest;
import com.durian.groupware.task.dto.TaskReorderRequest;
import com.durian.groupware.task.dto.TaskResponse;
import com.durian.groupware.task.dto.TaskStatusRequest;
import com.durian.groupware.task.dto.TaskUpdateRequest;
import com.durian.groupware.task.service.ActivityLogService;
import com.durian.groupware.task.service.TaskService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;
    private final ActivityLogService activityLogService;

    @PostMapping
    public ResponseEntity<TaskResponse> create(@Login LoginUser loginUser,
            @Valid @RequestBody TaskCreateRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(taskService.create(loginUser, req));
    }

    @GetMapping("/{id}")
    public TaskResponse get(@Login LoginUser loginUser, @PathVariable Long id) {
        return taskService.get(loginUser, id);
    }

    @PutMapping("/{id}")
    public TaskResponse update(@Login LoginUser loginUser,
            @PathVariable Long id,
            @Valid @RequestBody TaskUpdateRequest req) {
        return taskService.update(loginUser, id, req);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@Login LoginUser loginUser, @PathVariable Long id) {
        taskService.delete(loginUser, id);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{id}/status")
    public TaskResponse changeStatus(@Login LoginUser loginUser,
            @PathVariable Long id,
            @Valid @RequestBody TaskStatusRequest req) {
        return taskService.changeStatus(loginUser, id, req.status());
    }

    @PatchMapping("/{id}/progress")
    public TaskResponse changeProgress(@Login LoginUser loginUser,
            @PathVariable Long id,
            @Valid @RequestBody TaskProgressRequest req) {
        return taskService.changeProgress(loginUser, id, req.progressRate());
    }

    @PatchMapping("/{id}/parent")
    public TaskResponse setParent(@Login LoginUser loginUser,
            @PathVariable Long id,
            @RequestBody TaskParentRequest req) {
        return taskService.setParent(loginUser, id, req.parentTaskId());
    }

    @GetMapping("/{id}/assignees")
    public List<UserSummaryResponse> getAssignees(@Login LoginUser loginUser,
            @PathVariable Long id) {
        return taskService.getAssignees(loginUser, id);
    }

    @PutMapping("/{id}/assignees")
    public ResponseEntity<Void> replaceAssignees(@Login LoginUser loginUser,
            @PathVariable Long id,
            @RequestBody AssigneeRequest req) {
        taskService.replaceAssignees(loginUser, id, req.userIds());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/assignees/me")
    public ResponseEntity<Void> unassignSelf(@Login LoginUser loginUser, @PathVariable Long id) {
        taskService.unassignSelf(loginUser, id);
        return ResponseEntity.ok().build();
    }

    @GetMapping
    public List<TaskResponse> list(
            @Login LoginUser loginUser,
            @RequestParam String type,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(required = false, defaultValue = "MY") String scope,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) String keyword) {

        if ("EVENT".equals(type)) {
            return taskService.getCalendar(loginUser, from, to, scope, keyword);
        }
        if ("TODO".equals(type)) {
            return taskService.getMyTodos(loginUser, status, projectId, keyword, from, to);
        }
        throw new BusinessException(ErrorCode.INVALID_INPUT);
    }

    @PutMapping("/reorder")
    public ResponseEntity<Void> reorder(@Login LoginUser loginUser,
            @RequestBody TaskReorderRequest req) {
        taskService.reorder(loginUser, req.ids());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/participants")
    public ResponseEntity<Void> invite(@Login LoginUser loginUser,
            @PathVariable Long id,
            @RequestBody ParticipantInviteRequest req) {
        taskService.inviteParticipants(loginUser, id, req.userIds(), req.required());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}/participants")
    public List<TaskParticipantResponse> participants(@Login LoginUser loginUser,
            @PathVariable Long id) {
        return taskService.getParticipants(loginUser, id);
    }

    @PatchMapping("/{id}/participants/me")
    public ResponseEntity<Void> respond(@Login LoginUser loginUser,
            @PathVariable Long id,
            @Valid @RequestBody ParticipantResponseRequest req) {
        taskService.respondToInvite(loginUser, id, req.responseStatus());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}/activity-logs")
    public List<ActivityLog> activityLogs(@Login LoginUser loginUser,
            @PathVariable Long id) {
        // get()은 삭제된 작업을 404로 막는데, 방금 삭제한 작업의 "DELETE" 이력을
        // 보려는 경우가 정상적으로 있으므로 삭제 여부와 무관한 권한 확인을 쓴다.
        taskService.checkViewableForHistory(loginUser, id);
        return activityLogService.getByTaskId(id);
    }
}
