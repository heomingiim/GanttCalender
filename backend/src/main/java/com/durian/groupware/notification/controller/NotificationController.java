package com.durian.groupware.notification.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.durian.groupware.global.auth.Login;
import com.durian.groupware.global.auth.LoginUser;
import com.durian.groupware.notification.dto.NotificationResponse;
import com.durian.groupware.notification.service.NotificationService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public List<NotificationResponse> list(@Login LoginUser loginUser) {
        return notificationService.getMyNotifications(loginUser.id());
    }

    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount(@Login LoginUser loginUser) {
        return Map.of("count", notificationService.getUnreadCount(loginUser.id()));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(@Login LoginUser loginUser,
                                           @PathVariable Long id) {
        notificationService.markAsRead(loginUser.id(), id);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead(@Login LoginUser loginUser) {
        notificationService.markAllAsRead(loginUser.id());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@Login LoginUser loginUser,
                                       @PathVariable Long id) {
        notificationService.delete(loginUser.id(), id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping
    public ResponseEntity<Void> deleteAll(@Login LoginUser loginUser) {
        notificationService.deleteAll(loginUser.id());
        return ResponseEntity.ok().build();
    }
}