package com.durian.groupware.notification.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.durian.groupware.notification.dto.Notification;

@Mapper
public interface NotificationMapper {
    List<Notification> findByUserId(Long userId);
    long countUnread(Long userId);
    void insert(Notification notification);
    void markAsRead(@Param("id") Long id, @Param("userId") Long userId);
    void markAllAsRead(Long userId);
    void deleteById(@Param("id") Long id, @Param("userId") Long userId);
}