import client from './client';
import { toLocalDateTimeString } from '../utils/date';

export const getTask = (id) => client.get(`/tasks/${id}`);

export const createTask = (body) => client.post('/tasks', body);

export const updateTask = (id, body) => client.put(`/tasks/${id}`, body);

export const deleteTask = (id) => client.delete(`/tasks/${id}`);

export const unassignSelf = (id) => client.delete(`/tasks/${id}/assignees/me`);

export const changeStatus = (id, status) =>
  client.patch(`/tasks/${id}/status`, { status });

export const changeProgress = (id, progressRate) =>
  client.patch(`/tasks/${id}/progress`, { progressRate });

// from/to는 항상 채워 보낸다 (백엔드 null 기본값 없음)
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

export const reorderTasks = (ids) => client.put('/tasks/reorder', { ids });

export const setParent = (id, parentTaskId) =>
  client.patch(`/tasks/${id}/parent`, { parentTaskId });

export const getAssignees = (id) => client.get(`/tasks/${id}/assignees`);

export const replaceAssignees = (id, userIds) =>
  client.put(`/tasks/${id}/assignees`, { userIds });

export const getParticipants = (id) => client.get(`/tasks/${id}/participants`);

export const inviteParticipants = (id, userIds, required) =>
  client.post(`/tasks/${id}/participants`, { userIds, required });

export const respondToInvite = (id, responseStatus) =>
  client.patch(`/tasks/${id}/participants/me`, { responseStatus });

export const getActivityLogs = (id) => client.get(`/tasks/${id}/activity-logs`);
