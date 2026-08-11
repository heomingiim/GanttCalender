import client from './client';

// STEP 3 — 사용자 조회
export const searchUsers = (keyword, departmentId) =>
  client.get('/users/search', { params: { keyword, departmentId } });

export const getProfile = (id) => client.get(`/users/${id}`);
