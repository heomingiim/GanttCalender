import client from './client';

// 조직도
export const getTree = () => client.get('/departments/tree');

export const getUsersByDept = (departmentId) =>
  client.get(`/departments/${departmentId}/users`);
