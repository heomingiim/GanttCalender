import client from './client';

// STEP 3 — 조직도
export const getTree = () => client.get('/departments/tree');

export const getUsersByDept = (departmentId) =>
  client.get(`/departments/${departmentId}/users`);
