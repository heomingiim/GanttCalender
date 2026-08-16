import client from './client';
import { toLocalDateTimeString } from '../utils/date';

// ── Task CRUD ────────────────────────────────────────
export const getTask = (id) => client.get(`/tasks/${id}`);

export const createTask = (body) => client.post('/tasks', body);

export const updateTask = (id, body) => client.put(`/tasks/${id}`, body);

export const deleteTask = (id) => client.delete(`/tasks/${id}`);

export const changeStatus = (id, status) =>
  client.patch(`/tasks/${id}/status`, { status });

export const changeProgress = (id, progressRate) =>
  client.patch(`/tasks/${id}/progress`, { progressRate });

// ── 캘린더 조회 ──────────────────────────────────────
// from/to는 LocalDateTime이라 반드시 toLocalDateTimeString()으로 변환해서 보낸다.
// (백엔드 getCalendar는 null 기본값 처리가 없으므로 항상 채워 보낸다)
export const getCalendarEvents = ({ from, to, scope = 'MY', keyword }) =>
  client.get('/tasks', {
    params: {
      type: 'EVENT',
      from: toLocalDateTimeString(from),
      to: toLocalDateTimeString(to),
      scope,
      keyword: keyword || undefined,
    },
  });

// ── 투두리스트 ───────────────────────────────────────
export const getMyTodos = ({ status, projectId, keyword, from, to } = {}) =>
  client.get('/tasks', {
    params: {
      type: 'TODO',
      status: status || undefined,
      projectId: projectId || undefined,
      keyword: keyword || undefined,
      from: from ? `${from}T00:00:00` : undefined,
      to: to ? `${to}T23:59:59` : undefined,
    },
  });

// ── 순서 변경 ────────────────────────────────────────
export const reorderTasks = (ids) => client.put('/tasks/reorder', { ids });

// ── WBS 상위 작업 변경 ──────────────────────────────
// parentTaskId를 null로 보내면 최상위로 올라간다.
export const setParent = (id, parentTaskId) =>
  client.patch(`/tasks/${id}/parent`, { parentTaskId });

// ── 담당자 (백엔드 미구현 — 구현 시 바로 동작) ──────
export const getAssignees = (id) => client.get(`/tasks/${id}/assignees`);

export const replaceAssignees = (id, userIds) =>
  client.put(`/tasks/${id}/assignees`, { userIds });

// ── 참석자 (백엔드 미구현) ──────────────────────────
export const getParticipants = (id) => client.get(`/tasks/${id}/participants`);

export const inviteParticipants = (id, userIds, required) =>
  client.post(`/tasks/${id}/participants`, { userIds, required });

export const respondToInvite = (id, responseStatus) =>
  client.patch(`/tasks/${id}/participants/me`, { responseStatus });

// ── 활동 이력 (백엔드 미구현) ───────────────────────
export const getActivityLogs = (id) => client.get(`/tasks/${id}/activity-logs`);
