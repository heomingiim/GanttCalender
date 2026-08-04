package com.durian.groupware.task.controller;

import com.durian.groupware.global.auth.Login;
import com.durian.groupware.global.auth.LoginUser;
import com.durian.groupware.task.dto.TaskCreateRequest;
import com.durian.groupware.task.dto.TaskProgressRequest;
import com.durian.groupware.task.dto.TaskResponse;
import com.durian.groupware.task.dto.TaskStatusRequest;
import com.durian.groupware.task.dto.TaskUpdateRequest;
import com.durian.groupware.task.service.TaskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;

    // POST /api/tasks
    @PostMapping
    public ResponseEntity<TaskResponse> create(@Login LoginUser loginUser,
                                               @Valid @RequestBody TaskCreateRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                             .body(taskService.create(loginUser, req));
    }

    // GET /api/tasks/{id}
    @GetMapping("/{id}")
    public TaskResponse get(@Login LoginUser loginUser, @PathVariable Long id) {
        return taskService.get(loginUser, id);
    }

    // PUT /api/tasks/{id}
    @PutMapping("/{id}")
    public TaskResponse update(@Login LoginUser loginUser,
                               @PathVariable Long id,
                               @Valid @RequestBody TaskUpdateRequest req) {
        return taskService.update(loginUser, id, req);
    }

    // DELETE /api/tasks/{id} — 소프트 삭제
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@Login LoginUser loginUser, @PathVariable Long id) {
        taskService.delete(loginUser, id);
        return ResponseEntity.ok().build();
    }

    // PATCH /api/tasks/{id}/status
    @PatchMapping("/{id}/status")
    public TaskResponse changeStatus(@Login LoginUser loginUser,
                                     @PathVariable Long id,
                                     @Valid @RequestBody TaskStatusRequest req) {
        return taskService.changeStatus(loginUser, id, req.status());
    }

    // PATCH /api/tasks/{id}/progress
    @PatchMapping("/{id}/progress")
    public TaskResponse changeProgress(@Login LoginUser loginUser,
                                       @PathVariable Long id,
                                       @Valid @RequestBody TaskProgressRequest req) {
        return taskService.changeProgress(loginUser, id, req.progressRate());
    }
}
