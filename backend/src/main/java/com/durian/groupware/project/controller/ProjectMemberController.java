package com.durian.groupware.project.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.durian.groupware.global.auth.Login;
import com.durian.groupware.global.auth.LoginUser;
import com.durian.groupware.project.dto.MemberAddRequest;
import com.durian.groupware.project.dto.MemberRoleRequest;
import com.durian.groupware.project.dto.ProjectMemberResponse;
import com.durian.groupware.project.service.ProjectMemberService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/projects/{id}/members")
@RequiredArgsConstructor
public class ProjectMemberController {

    private final ProjectMemberService projectMemberService;

    @GetMapping
    public List<ProjectMemberResponse> list(@Login LoginUser loginUser,
                                            @PathVariable Long id) {
        return projectMemberService.getMembers(loginUser, id);
    }

    @PostMapping
    public ResponseEntity<Void> addMember(@Login LoginUser loginUser,
                                          @PathVariable Long id,
                                          @Valid @RequestBody MemberAddRequest req) {
        projectMemberService.addMember(loginUser, id, req);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> removeMember(@Login LoginUser loginUser,
                                             @PathVariable Long id,
                                             @PathVariable Long userId) {
        projectMemberService.removeMember(loginUser, id, userId);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{userId}/role")
    public ResponseEntity<Void> changeRole(@Login LoginUser loginUser,
                                           @PathVariable Long id,
                                           @PathVariable Long userId,
                                           @Valid @RequestBody MemberRoleRequest req) {
        projectMemberService.changeRole(loginUser, id, userId, req.role());
        return ResponseEntity.ok().build();
    }
}