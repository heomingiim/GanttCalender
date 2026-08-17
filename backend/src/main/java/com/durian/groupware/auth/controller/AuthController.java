package com.durian.groupware.auth.controller;

import com.durian.groupware.auth.dto.LoginRequest;
import com.durian.groupware.auth.dto.UserInfoResponse;
import com.durian.groupware.auth.service.AuthService;
import com.durian.groupware.global.auth.AuthInterceptor;
import com.durian.groupware.global.auth.Login;
import com.durian.groupware.global.auth.LoginUser;
import com.durian.groupware.user.dto.User;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    // POST /api/auth/login
    @PostMapping("/login")
    public ResponseEntity<UserInfoResponse> login(@Valid @RequestBody LoginRequest req,
                                                   HttpSession session) {
        User user = authService.authenticate(req.employeeNumber());

        // 세션에 로그인 정보 저장
        LoginUser loginUser = new LoginUser(
            user.getId(), user.getEmployeeNumber(),
            user.getName(), user.getRole(), user.getDepartmentId()
        );
        session.setAttribute(AuthInterceptor.SESSION_KEY, loginUser);

        return ResponseEntity.ok(authService.getUserInfo(user));
    }

    // POST /api/auth/logout
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpSession session) {
        session.invalidate();  // 세션 만료
        return ResponseEntity.ok().build();
    }

    // GET /api/auth/me  — 현재 로그인한 사용자 정보
    @GetMapping("/me")
    public UserInfoResponse getMe(@Login LoginUser loginUser) {
        return authService.getUserInfo(loginUser.id());
    }
}