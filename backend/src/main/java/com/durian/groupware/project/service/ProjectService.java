package com.durian.groupware.project.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.durian.groupware.global.auth.LoginUser;
import com.durian.groupware.global.auth.exception.BusinessException;
import com.durian.groupware.global.auth.exception.ErrorCode;
import com.durian.groupware.notification.service.NotificationService;
import com.durian.groupware.project.dto.Project;
import com.durian.groupware.project.dto.ProjectMember;
import com.durian.groupware.project.dto.ProjectRequest;
import com.durian.groupware.project.dto.ProjectResponse;
import com.durian.groupware.project.mapper.ProjectMapper;
import com.durian.groupware.project.mapper.ProjectMemberMapper;
import com.durian.groupware.task.dto.Task;
import com.durian.groupware.task.mapper.TaskMapper;

import lombok.RequiredArgsConstructor;

@Service @RequiredArgsConstructor
public class ProjectService {

    private final ProjectMapper projectMapper;
    private final ProjectMemberMapper memberMapper;
    private final NotificationService notificationService;
    private final TaskMapper taskMapper;

    // 리프(하위작업 없는) WBS 작업들의 진행률 평균. 취소된 작업은 집계에서 뺀다
    private Integer computeProgress(Long projectId) {
        List<Task> tasks = taskMapper.findByProjectIdNotDeleted(projectId).stream()
                .filter(t -> "WBS_TASK".equals(t.getTaskType()) && !"CANCELLED".equals(t.getStatus()))
                .toList();
        java.util.Set<Long> parentIds = tasks.stream()
                .map(Task::getParentTaskId).filter(java.util.Objects::nonNull).collect(java.util.stream.Collectors.toSet());
        List<Task> leaves = tasks.stream().filter(t -> !parentIds.contains(t.getId())).toList();
        if (leaves.isEmpty()) return null;
        return (int) Math.round(leaves.stream().mapToInt(Task::getProgressRate).average().orElse(0));
    }

    private String deriveStatus(Integer progress) {
        return progress == null || progress == 0 ? "PLANNED"
                : progress >= 100 ? "DONE" : "IN_PROGRESS";
    }

    // 진행률 기반으로 프로젝트 상태를 자동 파생해 응답에만 반영. CANCELLED는 유지. DB는 쓰지 않는다.
    private ProjectResponse toResponse(Project p) {
        Integer progress = computeProgress(p.getId());
        if (!"CANCELLED".equals(p.getStatus())) {
            p.setStatus(deriveStatus(progress));
        }
        return ProjectResponse.from(p, progress);
    }

    // 태스크 진행률/상태가 바뀔 때 호출되어 프로젝트 상태를 실제로 DB에 반영한다.
    public void syncStatus(Long projectId) {
        Project project = projectMapper.findByIdNotDeleted(projectId);
        if (project == null || "CANCELLED".equals(project.getStatus())) return;

        String derived = deriveStatus(computeProgress(projectId));
        if (!derived.equals(project.getStatus())) {
            project.setStatus(derived);
            projectMapper.update(project);
        }
    }

    public ProjectResponse create(LoginUser loginUser, ProjectRequest req) {
        if ("MEMBER".equals(loginUser.role())) {
            throw new BusinessException(ErrorCode.PROJECT_CREATE_FORBIDDEN);
        }

        Project project = new Project();
        project.setName(req.name());
        project.setDescription(req.description());
        project.setOwnerId(loginUser.id());
        project.setStartDate(req.startDate());
        project.setEndDate(req.endDate());
        project.setStatus("PLANNED");
        project.setVisibility(req.visibility() != null ? req.visibility() : "PUBLIC");
        projectMapper.insert(project);

        // 생성자는 자동으로 ADMIN 멤버로 추가
        ProjectMember member = new ProjectMember();
        member.setProjectId(project.getId());
        member.setUserId(loginUser.id());
        member.setRole("ADMIN");
        memberMapper.insert(member);

        return toResponse(project);
    }

    // 내가 속한 프로젝트 목록
    public List<ProjectResponse> getMyProjects(LoginUser loginUser) {
        return projectMapper.findByMemberId(loginUser.id()).stream()
                .map(this::toResponse)
                .toList();
    }

    // 상세 — 멤버만 조회 가능
    public ProjectResponse get(LoginUser loginUser, Long id) {
        Project project = projectMapper.findByIdNotDeleted(id);
        if (project == null) throw new BusinessException(ErrorCode.PROJECT_NOT_FOUND);

        ProjectMember member = memberMapper.findByProjectAndUser(id, loginUser.id());
        if (member == null) throw new BusinessException(ErrorCode.NOT_PROJECT_MEMBER);

        return toResponse(project);
    }

    public ProjectResponse update(LoginUser loginUser, Long id, ProjectRequest req) {
        Project project = projectMapper.findByIdNotDeleted(id);
        if (project == null) throw new BusinessException(ErrorCode.PROJECT_NOT_FOUND);
        checkAdmin(loginUser, id);

        project.setName(req.name());
        project.setDescription(req.description());
        project.setStartDate(req.startDate());
        project.setEndDate(req.endDate());
        if (req.status() != null) project.setStatus(req.status());
        if (req.visibility() != null) project.setVisibility(req.visibility());
        projectMapper.update(project);

        return toResponse(projectMapper.findByIdNotDeleted(id));
    }

    // 소프트 삭제
    public void delete(LoginUser loginUser, Long id) {
        Project project = projectMapper.findByIdNotDeleted(id);
        if (project == null) throw new BusinessException(ErrorCode.PROJECT_NOT_FOUND);
        checkAdmin(loginUser, id);

        List<ProjectMember> members = memberMapper.findByProjectId(id);
        projectMapper.softDelete(id);
        for (ProjectMember member : members) {
            if (member.getUserId().equals(loginUser.id())) continue;
            notificationService.notifyNow(member.getUserId(), null, "PROJECT_DELETE",
                    "'" + project.getName() + "' 프로젝트가 삭제되었습니다.");
        }
    }

    // ADMIN만 수정/삭제 가능
    private void checkAdmin(LoginUser loginUser, Long projectId) {
        ProjectMember member = memberMapper.findByProjectAndUser(projectId, loginUser.id());
        if (member == null || !"ADMIN".equals(member.getRole())) {
            throw new BusinessException(ErrorCode.PROJECT_FORBIDDEN);
        }
    }
}