package com.durian.groupware.project.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.durian.groupware.global.auth.LoginUser;
import com.durian.groupware.global.auth.exception.BusinessException;
import com.durian.groupware.global.auth.exception.ErrorCode;
import com.durian.groupware.project.dto.MemberAddRequest;
import com.durian.groupware.project.dto.ProjectMember;
import com.durian.groupware.project.dto.ProjectMemberResponse;
import com.durian.groupware.project.mapper.ProjectMemberMapper;

import lombok.RequiredArgsConstructor;

@Service @RequiredArgsConstructor
public class ProjectMemberService {

    private final ProjectMemberMapper memberMapper;

    public List<ProjectMemberResponse> getMembers(LoginUser loginUser, Long projectId) {
        checkMember(loginUser.id(), projectId);
        return memberMapper.findMembersByProjectId(projectId);
    }

    public void addMember(LoginUser loginUser, Long projectId, MemberAddRequest req) {
        checkAdmin(loginUser, projectId);
        ProjectMember member = new ProjectMember();
        member.setProjectId(projectId);
        member.setUserId(req.userId());
        member.setRole(req.role() != null ? req.role() : "MEMBER");
        memberMapper.insert(member);
    }

    public void removeMember(LoginUser loginUser, Long projectId, Long userId) {
        checkAdmin(loginUser, projectId);
        memberMapper.delete(projectId, userId);
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

    private void checkAdmin(LoginUser loginUser, Long projectId) {
        ProjectMember member = memberMapper.findByProjectAndUser(projectId, loginUser.id());
        if (member == null || !"ADMIN".equals(member.getRole())) {
            throw new BusinessException(ErrorCode.PROJECT_FORBIDDEN);
        }
    }
}