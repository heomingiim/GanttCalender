package com.durian.groupware.project.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.durian.groupware.project.dto.ProjectMember;
import com.durian.groupware.project.dto.ProjectMemberResponse;

@Mapper
public interface ProjectMemberMapper {
    ProjectMember findByProjectAndUser(@Param("projectId") Long projectId,
                                      @Param("userId") Long userId);
    List<ProjectMember> findByProjectId(Long projectId);

    // 멤버 목록 응답용 — users/departments를 JOIN해서 이름까지 채워 온다
    List<ProjectMemberResponse> findMembersByProjectId(Long projectId);

    void insert(ProjectMember member);
    void updateRole(@Param("projectId") Long projectId, @Param("userId") Long userId,
                    @Param("role") String role);
    void delete(@Param("projectId") Long projectId, @Param("userId") Long userId);
}