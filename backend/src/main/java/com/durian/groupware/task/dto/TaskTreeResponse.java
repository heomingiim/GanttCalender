package com.durian.groupware.task.dto;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// 간트차트/WBS 트리 응답. children에 하위 작업이 재귀적으로 담긴다.
@Getter
@Setter
@NoArgsConstructor
public class TaskTreeResponse {
    private Long id;
    private Long parentTaskId;
    private String title;
    private String taskType;      // TODO / EVENT / WBS_TASK / MILESTONE
    private String status;
    private String priority;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private Integer progressRate;

    // 반드시 빈 리스트로 초기화 — 아래 조립 로직이 parent.getChildren().add(...)를 호출한다
    private List<TaskTreeResponse> children = new ArrayList<>();

    public static TaskTreeResponse from(Task t) {
        TaskTreeResponse r = new TaskTreeResponse();
        r.setId(t.getId());
        r.setParentTaskId(t.getParentTaskId());
        r.setTitle(t.getTitle());
        r.setTaskType(t.getTaskType());
        r.setStatus(t.getStatus());
        r.setPriority(t.getPriority());
        r.setStartDate(t.getStartDate());
        r.setEndDate(t.getEndDate());
        r.setProgressRate(t.getProgressRate());
        return r;
    }
}