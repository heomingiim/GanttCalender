// 백엔드 enum 문자열 ↔ 한글 라벨 / 색상 매핑.
// 서버는 'IN_PROGRESS' 같은 코드만 주므로 표시용 변환표를 프론트가 들고 있는다.

export const TASK_TYPE = {
  TODO: '투두',
  EVENT: '일정',
  WBS_TASK: 'WBS 작업',
  MILESTONE: '마일스톤',
};

export const STATUS = {
  TODO: '대기',
  IN_PROGRESS: '진행중',
  DONE: '완료',
  CANCELLED: '취소',
};

// MUI Chip color prop에 그대로 넣는 값
export const STATUS_COLOR = {
  TODO: 'default',
  IN_PROGRESS: 'info',
  DONE: 'success',
  CANCELLED: 'error',
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

export const VISIBILITY = {
  PUBLIC: '공개',
  PRIVATE: '비공개',
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
  INVITE: '일정 초대',
  CANCEL: '일정 취소',
  DEADLINE: '마감 임박',
};

export const ACTIVITY_ACTION = {
  CREATE: '생성',
  UPDATE: '수정',
  DELETE: '삭제',
  STATUS_CHANGE: '상태 변경',
};

// '팀 공용 카테고리'처럼 팀장급 이상만 가능한 동작 판별.
// 백엔드 CategoryService가 "MEMBER면 거부"로 판단하므로 프론트도 같은 기준을 쓴다.
export const isTeamLeadOrAbove = (role) => role !== 'MEMBER';

// 캘린더 일정 막대 색상 (카테고리 색이 없을 때 우선순위별 기본색)
export const PRIORITY_HEX = {
  HIGH: '#d32f2f',
  MEDIUM: '#1976d2',
  LOW: '#78909c',
};
