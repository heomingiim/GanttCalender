package com.durian.groupware.stats.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.durian.groupware.global.auth.Login;
import com.durian.groupware.global.auth.LoginUser;
import com.durian.groupware.stats.dto.DashboardResponse;
import com.durian.groupware.stats.service.StatsService;

import lombok.RequiredArgsConstructor;

// StatsController는 @RequestMapping("/api/stats")라서 여기에 넣으면
// 경로가 /api/stats/api/dashboard로 합쳐진다. 그래서 별도 컨트롤러로 분리한다.
@RestController
@RequiredArgsConstructor
public class DashboardController {

    private final StatsService statsService;

    @GetMapping("/api/dashboard")
    public DashboardResponse dashboard(@Login LoginUser loginUser) {
        return statsService.getDashboard(loginUser.id());
    }
}
