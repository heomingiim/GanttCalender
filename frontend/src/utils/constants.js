// 백엔드 enum 코드 ↔ 한글 라벨 / 색상 매핑

export const TASK_TYPE = {
  TODO: '투두',
  EVENT: '일정',
  WBS_TASK: 'WBS 작업',
};

export const STATUS = {
  TODO: '대기',
  IN_PROGRESS: '진행중',
  DONE: '완료',
  CANCELLED: '취소',
};

export const STATUS_COLOR = {
  TODO: 'default',
  IN_PROGRESS: 'info',
  DONE: 'success',
  CANCELLED: 'error',
};

// 간트 막대 등 bgcolor에 직접 쓰는 hex 색상
export const STATUS_BAR_COLOR = {
  TODO: '#90a4ae',
  IN_PROGRESS: '#1976d2',
  DONE: '#2e7d32',
  CANCELLED: '#c62828',
};

export const PRIORITY = {
  LOW: '낮음',
  MEDIUM: '보통',
  HIGH: '높음',
};

export const PRIORITY_COLOR = {
  LOW: 'default',
  MEDIUM: 'warning',
  HIGH: 'error',
};

// PUBLIC이면 같은 부서 "팀 일정" 조회에도 나타남
export const VISIBILITY = {
  PUBLIC: '팀',
  PRIVATE: '개인',
};

export const PROJECT_STATUS = {
  PLANNED: '계획',
  IN_PROGRESS: '진행중',
  DONE: '완료',
  ON_HOLD: '보류',
};

export const PROJECT_STATUS_COLOR = {
  PLANNED: 'default',
  IN_PROGRESS: 'info',
  DONE: 'success',
  ON_HOLD: 'warning',
};

export const USER_ROLE = {
  CEO: '대표이사',
  DIVISION_HEAD: '본부장',
  TEAM_LEAD: '팀장',
  MEMBER: '팀원',
};

export const PROJECT_MEMBER_ROLE = {
  ADMIN: '관리자',
  MEMBER: '멤버',
};

export const PARTICIPANT_RESPONSE = {
  PENDING: '미응답',
  ACCEPTED: '참석',
  DECLINED: '불참',
  TENTATIVE: '미정',
};

export const PARTICIPANT_RESPONSE_COLOR = {
  PENDING: 'default',
  ACCEPTED: 'success',
  DECLINED: 'error',
  TENTATIVE: 'warning',
};

export const NOTIFICATION_TYPE = {
  ASSIGN: '담당자 지정',
  UNASSIGN: '담당자 해제',
  INVITE: '일정 초대',
  CANCEL: '일정 취소',
  DEADLINE: '마감 임박',
  UPDATE: '일정 변경',
  STATUS_CHANGE: '상태 변경',
  PROJECT_INVITE: '프로젝트 초대',
  PROJECT_REMOVE: '프로젝트 제외',
  PROJECT_DELETE: '프로젝트 삭제',
};

export const ACTIVITY_ACTION = {
  CREATE: '생성',
  UPDATE: '수정',
  DELETE: '삭제',
  STATUS_CHANGE: '상태 변경',
  PROGRESS_CHANGE: '진행률 변경',
  PARENT_CHANGE: '상위 작업 변경',
};

export const isTeamLeadOrAbove = (role) => role !== 'MEMBER';

// 카테고리 색 없을 때 우선순위별 기본 hex
export const PRIORITY_HEX = {
  HIGH: '#d32f2f',
  MEDIUM: '#1976d2',
  LOW: '#78909c',
};
