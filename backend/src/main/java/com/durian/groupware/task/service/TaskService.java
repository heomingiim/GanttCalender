package com.durian.groupware.task.service;

import com.durian.groupware.global.auth.LoginUser;
import com.durian.groupware.global.auth.exception.BusinessException;
import com.durian.groupware.global.auth.exception.ErrorCode;
import com.durian.groupware.task.dto.Task;
import com.durian.groupware.task.dto.TaskCreateRequest;
import com.durian.groupware.task.dto.TaskResponse;
import com.durian.groupware.task.dto.TaskUpdateRequest;
import com.durian.groupware.task.mapper.TaskMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service @RequiredArgsConstructor
public class TaskService {

    private final TaskMapper taskMapper;

    // 생성
    public TaskResponse create(LoginUser loginUser, TaskCreateRequest req) {
        // 날짜 유효성 검사
        if (req.startDate() != null && req.endDate() != null
                && req.startDate().isAfter(req.endDate())) {
            throw new BusinessException(ErrorCode.INVALID_TASK_DATE);
        }

        Task task = new Task();
        task.setCreatorId(loginUser.id());
        task.setProjectId(req.projectId());
        task.setParentTaskId(req.parentTaskId());
        task.setCategoryId(req.categoryId());
        task.setTaskType(req.taskType());
        task.setTitle(req.title());
        task.setDescription(req.description());
        task.setStartDate(req.startDate());
        task.setEndDate(req.endDate());
        task.setAllDay(Boolean.TRUE.equals(req.allDay()));
        task.setVisibility(req.visibility() != null ? req.visibility() : "PUBLIC");
        task.setStatus(req.status() != null ? req.status() : "TODO");
        task.setPriority(req.priority() != null ? req.priority() : "MEDIUM");
        task.setProgressRate(0);

        taskMapper.insert(task);
        return TaskResponse.from(taskMapper.findByIdNotDeleted(task.getId()));
    }

    // 조회 (권한 체크 포함)
    public TaskResponse get(LoginUser loginUser, Long id) {
        Task task = taskMapper.findByIdNotDeleted(id);
        if (task == null) throw new BusinessException(ErrorCode.TASK_NOT_FOUND);
        if (!canView(loginUser, task)) throw new BusinessException(ErrorCode.TASK_FORBIDDEN);
        return TaskResponse.from(task);
    }

    // 수정
    public TaskResponse update(LoginUser loginUser, Long id, TaskUpdateRequest req) {
        Task task = getEditable(loginUser, id);

        if (req.startDate() != null && req.endDate() != null
                && req.startDate().isAfter(req.endDate())) {
            throw new BusinessException(ErrorCode.INVALID_TASK_DATE);
        }

        task.setTitle(req.title());
        task.setDescription(req.description());
        task.setStartDate(req.startDate());
        task.setEndDate(req.endDate());
        task.setAllDay(Boolean.TRUE.equals(req.allDay()));
        task.setVisibility(req.visibility());
        task.setPriority(req.priority());
        task.setCategoryId(req.categoryId());
        taskMapper.update(task);

        return TaskResponse.from(taskMapper.findByIdNotDeleted(id));
    }

    // 삭제 (소프트)
    public void delete(LoginUser loginUser, Long id) {
        Task task = getEditable(loginUser, id);
        taskMapper.softDelete(id);
    }

    // 상태 변경 — 상태와 진행률을 함께 동기화
    public TaskResponse changeStatus(LoginUser loginUser, Long id, String status) {
        Task task = getEditable(loginUser, id);
        int progressRate = task.getProgressRate();

        if ("DONE".equals(status)) {
            progressRate = 100;
        } else if ("TODO".equals(status)) {
            progressRate = 0;
        }
        // IN_PROGRESS / CANCELLED는 진행률 그대로 유지

        taskMapper.changeStatus(id, status, progressRate);
        return TaskResponse.from(taskMapper.findByIdNotDeleted(id));
    }

    // 진행률 변경 (상태 변경은 changeStatus 사용)
    public TaskResponse changeProgress(LoginUser loginUser, Long id, int rate) {
        Task task = getEditable(loginUser, id);
        taskMapper.changeProgress(id, rate);
        return TaskResponse.from(taskMapper.findByIdNotDeleted(id));
    }

    // ============ 내부 유틸 ============

    private Task getEditable(LoginUser loginUser, Long id) {
        Task task = taskMapper.findByIdNotDeleted(id);
        if (task == null) throw new BusinessException(ErrorCode.TASK_NOT_FOUND);
        if (!canEdit(loginUser, task)) throw new BusinessException(ErrorCode.TASK_FORBIDDEN);
        return task;
    }

    private boolean canEdit(LoginUser loginUser, Task task) {
        // 생성자 본인이면 수정 가능
        if (loginUser.id().equals(task.getCreatorId())) return true;
        // 팀 공용 EVENT는 팀장급 이상도 수정 가능
        if ("EVENT".equals(task.getTaskType()) && !"MEMBER".equals(loginUser.role())) return true;
        return false;
    }

    private boolean canView(LoginUser loginUser, Task task) {
        if (loginUser.id().equals(task.getCreatorId())) return true;
        if ("TODO".equals(task.getTaskType())) return false; // 투두는 본인만
        return "PUBLIC".equals(task.getVisibility());
    }
}