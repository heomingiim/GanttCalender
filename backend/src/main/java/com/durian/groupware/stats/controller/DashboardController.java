package com.durian.groupware.stats.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.durian.groupware.global.auth.Login;
import com.durian.groupware.global.auth.LoginUser;
import com.durian.groupware.stats.dto.DashboardResponse;
import com.durian.groupware.stats.service.StatsService;

import lombok.RequiredArgsConstructor;

// /api/stats prefix 충돌로 StatsController에서 분리
@RestController
@RequiredArgsConstructor
public class DashboardController {

    private final StatsService statsService;

    @GetMapping("/api/dashboard")
    public DashboardResponse dashboard(@Login LoginUser loginUser) {
        return statsService.getDashboard(loginUser);
    }
}
