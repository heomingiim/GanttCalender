import client from './client';

// ── STEP 9 : 프로젝트 ─────────────────────────────────────────
export const listProjects = () => client.get('/projects');

export const getProject = (id) => client.get(`/projects/${id}`);

// body: { name, description, startDate, endDate, status }
// startDate/endDate는 LocalDate라서 'YYYY-MM-DD' 형식
export const createProject = (body) => client.post('/projects', body);

export const updateProject = (id, body) => client.put(`/projects/${id}`, body);

export const deleteProject = (id) => client.delete(`/projects/${id}`);

// ── STEP 9 : 멤버 ─────────────────────────────────────────────
export const listMembers = (projectId) =>
  client.get(`/projects/${projectId}/members`);

export const addMember = (projectId, userId, role = 'MEMBER') =>
  client.post(`/projects/${projectId}/members`, { userId, role });

export const removeMember = (projectId, userId) =>
  client.delete(`/projects/${projectId}/members/${userId}`);

export const changeMemberRole = (projectId, userId, role) =>
  client.patch(`/projects/${projectId}/members/${userId}/role`, { role });

// ── STEP 11 : 간트차트용 WBS 트리 ─────────────────────────────
// 응답은 children이 재귀로 들어있는 트리. 화면에서 flattenTree()로 편다.
export const getProjectTasks = (projectId) =>
  client.get(`/projects/${projectId}/tasks`);
