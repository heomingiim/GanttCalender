package com.durian.groupware.project.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.durian.groupware.global.auth.LoginUser;
import com.durian.groupware.global.auth.exception.BusinessException;
import com.durian.groupware.global.auth.exception.ErrorCode;
import com.durian.groupware.notification.service.NotificationService;
import com.durian.groupware.project.dto.MemberAddRequest;
import com.durian.groupware.project.dto.Project;
import com.durian.groupware.project.dto.ProjectMember;
import com.durian.groupware.project.dto.ProjectMemberResponse;
import com.durian.groupware.project.mapper.ProjectMapper;
import com.durian.groupware.project.mapper.ProjectMemberMapper;

import lombok.RequiredArgsConstructor;

@Service @RequiredArgsConstructor
public class ProjectMemberService {

    private final ProjectMemberMapper memberMapper;
    private final ProjectMapper projectMapper;
    private final NotificationService notificationService;

    public List<ProjectMemberResponse> getMembers(LoginUser loginUser, Long projectId) {
        checkMember(loginUser.id(), projectId);
        return memberMapper.findMembersByProjectId(projectId);
    }

    public void addMember(LoginUser loginUser, Long projectId, MemberAddRequest req) {
        checkAdmin(loginUser, projectId);
        if (isMember(req.userId(), projectId)) {
            throw new BusinessException(ErrorCode.ALREADY_PROJECT_MEMBER);
        }
        ProjectMember member = new ProjectMember();
        member.setProjectId(projectId);
        member.setUserId(req.userId());
        member.setRole(req.role() != null ? req.role() : "MEMBER");
        memberMapper.insert(member);
        notifyMember(req.userId(), projectId, "PROJECT_INVITE", "프로젝트에 초대되었습니다.");
    }

    // 참석자 초대 시 호출 — 프로젝트가 보이도록 MEMBER로 등록만 한다. 이미 멤버면 무시
    public void ensureMember(Long userId, Long projectId) {
        if (isMember(userId, projectId)) {
            return;
        }
        ProjectMember member = new ProjectMember();
        member.setProjectId(projectId);
        member.setUserId(userId);
        member.setRole("MEMBER");
        memberMapper.insert(member);
    }

    public void removeMember(LoginUser loginUser, Long projectId, Long userId) {
        checkAdmin(loginUser, projectId);
        memberMapper.delete(projectId, userId);
        notifyMember(userId, projectId, "PROJECT_REMOVE", "프로젝트 멤버에서 제외되었습니다.");
    }

    private void notifyMember(Long userId, Long projectId, String type, String message) {
        Project project = projectMapper.findByIdNotDeleted(projectId);
        String title = project != null ? project.getName() : "";
        notificationService.notifyNow(userId, null, type, "'" + title + "' " + message);
    }

    public void changeRole(LoginUser loginUser, Long projectId, Long userId, String role) {
        checkAdmin(loginUser, projectId);
        memberMapper.updateRole(projectId, userId, role);
    }

    public void checkMember(Long userId, Long projectId) {
        ProjectMember member = memberMapper.findByProjectAndUser(projectId, userId);
        if (member == null) {
            throw new BusinessException(ErrorCode.NOT_PROJECT_MEMBER);
        }
    }

    public boolean isMember(Long userId, Long projectId) {
        return memberMapper.findByProjectAndUser(projectId, userId) != null;
    }

    public boolean isAdmin(Long userId, Long projectId) {
        ProjectMember member = memberMapper.findByProjectAndUser(projectId, userId);
        return member != null && "ADMIN".equals(member.getRole());
    }

    private void checkAdmin(LoginUser loginUser, Long projectId) {
        ProjectMember member = memberMapper.findByProjectAndUser(projectId, loginUser.id());
        if (member == null || !"ADMIN".equals(member.getRole())) {
            throw new BusinessException(ErrorCode.PROJECT_FORBIDDEN);
        }
    }
}