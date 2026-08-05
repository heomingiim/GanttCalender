package com.durian.groupware.user.controller;

import com.durian.groupware.user.dto.UserProfileResponse;
import com.durian.groupware.user.dto.UserSummaryResponse;
import com.durian.groupware.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/{id}")
    public UserProfileResponse getProfile(@PathVariable Long id) {
        return userService.getProfile(id);
    }

    @GetMapping("/search")
    public List<UserSummaryResponse> search(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long departmentId) {
        return userService.search(keyword, departmentId);
    }
}
