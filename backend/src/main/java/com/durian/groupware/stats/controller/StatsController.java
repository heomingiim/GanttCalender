package com.durian.groupware.stats.controller;

import java.time.LocalDate;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.durian.groupware.global.auth.Login;
import com.durian.groupware.global.auth.LoginUser;
import com.durian.groupware.stats.dto.StatsResponse;
import com.durian.groupware.stats.service.StatsService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class StatsController {

    private final StatsService statsService;

    // GET /api/stats/personal?unit=WEEK&from=2026-07-01&to=2026-08-12&scope=TEAM
    @GetMapping("/personal")
    public StatsResponse personal(
            @Login LoginUser loginUser,
            @RequestParam(required = false, defaultValue = "MONTH") String unit,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false, defaultValue = "MY") String scope) {

        return statsService.getPersonalStats(loginUser, unit, from, to, scope);
    }
}
