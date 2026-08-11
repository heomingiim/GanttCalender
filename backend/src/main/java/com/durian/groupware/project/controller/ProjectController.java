package com.durian.groupware.project.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.durian.groupware.global.auth.Login;
import com.durian.groupware.global.auth.LoginUser;
import com.durian.groupware.project.dto.ProjectRequest;
import com.durian.groupware.project.dto.ProjectResponse;
import com.durian.groupware.project.service.ProjectMemberService;
import com.durian.groupware.project.service.ProjectService;
import com.durian.groupware.task.dto.TaskTreeResponse;
import com.durian.groupware.task.service.TaskService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;
    private final TaskService taskService;
    private final ProjectMemberService projectMemberService;

    // GET /api/projects — 내가 속한 프로젝트 목록
    @GetMapping
    public List<ProjectResponse> list(@Login LoginUser loginUser) {
        return projectService.getMyProjects(loginUser);
    }

    // POST /api/projects
    @PostMapping
    public ResponseEntity<ProjectResponse> create(@Login LoginUser loginUser,
            @Valid @RequestBody ProjectRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(projectService.create(loginUser, req));
    }

    // GET /api/projects/{id}
    @GetMapping("/{id}")
    public ProjectResponse get(@Login LoginUser loginUser, @PathVariable Long id) {
        return projectService.get(loginUser, id);
    }

    // PUT /api/projects/{id} — ADMIN만
    @PutMapping("/{id}")
    public ProjectResponse update(@Login LoginUser loginUser,
            @PathVariable Long id,
            @Valid @RequestBody ProjectRequest req) {
        return projectService.update(loginUser, id, req);
    }


    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@Login LoginUser loginUser, @PathVariable Long id) {
        projectService.delete(loginUser, id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}/tasks")
    public List<TaskTreeResponse> getProjectTasks(@Login LoginUser loginUser,
            @PathVariable Long id) {
 
        projectMemberService.checkMember(loginUser.id(), id);
        return taskService.getProjectTree(id);
    }
}
