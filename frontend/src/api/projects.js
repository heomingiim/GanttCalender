import client from './client';

export const listProjects = () => client.get('/projects');

export const getProject = (id) => client.get(`/projects/${id}`);

export const createProject = (body) => client.post('/projects', body);

export const updateProject = (id, body) => client.put(`/projects/${id}`, body);

export const deleteProject = (id) => client.delete(`/projects/${id}`);

export const listMembers = (projectId) =>
  client.get(`/projects/${projectId}/members`);

export const addMember = (projectId, userId, role = 'MEMBER') =>
  client.post(`/projects/${projectId}/members`, { userId, role });

export const removeMember = (projectId, userId) =>
  client.delete(`/projects/${projectId}/members/${userId}`);

export const changeMemberRole = (projectId, userId, role) =>
  client.patch(`/projects/${projectId}/members/${userId}/role`, { role });

export const getProjectTasks = (projectId) =>
  client.get(`/projects/${projectId}/tasks`);
