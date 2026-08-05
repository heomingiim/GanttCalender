package com.durian.groupware.project.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.durian.groupware.global.auth.LoginUser;
import com.durian.groupware.global.auth.exception.BusinessException;
import com.durian.groupware.global.auth.exception.ErrorCode;
import com.durian.groupware.project.dto.Project;
import com.durian.groupware.project.dto.ProjectMember;
import com.durian.groupware.project.dto.ProjectRequest;
import com.durian.groupware.project.dto.ProjectResponse;
import com.durian.groupware.project.mapper.ProjectMapper;
import com.durian.groupware.project.mapper.ProjectMemberMapper;

import lombok.RequiredArgsConstructor;

@Service @RequiredArgsConstructor
public class ProjectService {

    private final ProjectMapper projectMapper;
    private final ProjectMemberMapper memberMapper;

    public ProjectResponse create(LoginUser loginUser, ProjectRequest req) {
        Project project = new Project();
        project.setName(req.name());
        project.setDescription(req.description());
        project.setOwnerId(loginUser.id());
        project.setStartDate(req.startDate());
        project.setEndDate(req.endDate());
        project.setStatus("PLANNED");
        projectMapper.insert(project);

        // 생성자는 자동으로 ADMIN 멤버로 추가
        ProjectMember member = new ProjectMember();
        member.setProjectId(project.getId());
        member.setUserId(loginUser.id());
        member.setRole("ADMIN");
        memberMapper.insert(member);

        return ProjectResponse.from(project);
    }

    // 내가 속한 프로젝트 목록
    public List<ProjectResponse> getMyProjects(LoginUser loginUser) {
        return projectMapper.findByMemberId(loginUser.id())
                            .stream().map(ProjectResponse::from).toList();
    }

    // 상세 — 멤버만 조회 가능
    public ProjectResponse get(LoginUser loginUser, Long id) {
        Project project = projectMapper.findByIdNotDeleted(id);
        if (project == null) throw new BusinessException(ErrorCode.PROJECT_NOT_FOUND);

        ProjectMember member = memberMapper.findByProjectAndUser(id, loginUser.id());
        if (member == null) throw new BusinessException(ErrorCode.NOT_PROJECT_MEMBER);

        return ProjectResponse.from(project);
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
        projectMapper.update(project);

        return ProjectResponse.from(projectMapper.findByIdNotDeleted(id));
    }

    // 소프트 삭제
    public void delete(LoginUser loginUser, Long id) {
        Project project = projectMapper.findByIdNotDeleted(id);
        if (project == null) throw new BusinessException(ErrorCode.PROJECT_NOT_FOUND);
        checkAdmin(loginUser, id);
        projectMapper.softDelete(id);
    }

    // ADMIN만 수정/삭제 가능
    private void checkAdmin(LoginUser loginUser, Long projectId) {
        ProjectMember member = memberMapper.findByProjectAndUser(projectId, loginUser.id());
        if (member == null || !"ADMIN".equals(member.getRole())) {
            throw new BusinessException(ErrorCode.PROJECT_FORBIDDEN);
        }
    }
}