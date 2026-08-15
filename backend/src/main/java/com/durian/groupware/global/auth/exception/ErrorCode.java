package com.durian.groupware.global.auth.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {

    // 인증
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다."),
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 사원번호입니다."),
    USER_RESIGNED(HttpStatus.FORBIDDEN, "퇴직한 사용자입니다."),

    // 작업
    TASK_NOT_FOUND(HttpStatus.NOT_FOUND, "작업을 찾을 수 없습니다."),
    TASK_FORBIDDEN(HttpStatus.FORBIDDEN, "작업을 수정할 권한이 없습니다."),
    INVALID_TASK_DATE(HttpStatus.BAD_REQUEST, "시작일은 종료일보다 앞이어야 합니다."),
    PARENT_NOT_FOUND(HttpStatus.NOT_FOUND, "상위 작업을 찾을 수 없습니다."),
    PARENT_OTHER_PROJECT(HttpStatus.BAD_REQUEST, "다른 프로젝트의 작업은 상위 작업으로 지정할 수 없습니다."),
    NOT_PARTICIPANT(HttpStatus.FORBIDDEN, "이 일정의 참석자가 아닙니다."),
    INVALID_PARTICIPANT_RESPONSE(HttpStatus.BAD_REQUEST, "참석 응답 값이 올바르지 않습니다."),

    // 프로젝트
    PROJECT_NOT_FOUND(HttpStatus.NOT_FOUND, "프로젝트를 찾을 수 없습니다."),
    PROJECT_FORBIDDEN(HttpStatus.FORBIDDEN, "프로젝트 관리자만 가능합니다."),
    NOT_PROJECT_MEMBER(HttpStatus.FORBIDDEN, "프로젝트 멤버가 아닙니다."),

    // 카테고리
    CATEGORY_NOT_FOUND(HttpStatus.NOT_FOUND, "카테고리를 찾을 수 없습니다."),
    CATEGORY_FORBIDDEN(HttpStatus.FORBIDDEN, "팀 공용 카테고리는 팀장급 이상만 관리 가능합니다."),

    // 기타
    INVALID_INPUT(HttpStatus.BAD_REQUEST, "잘못된 요청입니다."),
    SCOPE_NOT_ALLOWED(HttpStatus.FORBIDDEN, "조회 범위 권한을 초과했습니다."),
    NO_DEPARTMENT(HttpStatus.BAD_REQUEST, "소속 부서가 없어 팀 일정을 조회할 수 없습니다."),
    CIRCULAR_PARENT(HttpStatus.BAD_REQUEST, "순환 상위 작업은 설정할 수 없습니다.");

    private final HttpStatus status;
    private final String message;
}