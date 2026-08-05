package com.durian.groupware.project.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;

import com.durian.groupware.project.dto.Project;

@Mapper
public interface ProjectMapper {
    Project findById(Long id);
    Project findByIdNotDeleted(Long id);
    List<Project> findByMemberId(Long userId);
    void insert(Project project);
    void update(Project project);
    void softDelete(Long id);
}