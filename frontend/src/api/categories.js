import client from './client';

// 카테고리 CRUD
// 응답: [{ id, name, color, team }]  ← team이 true면 팀 공용
export const listCategories = () => client.get('/categories');

// body: { name, color, isTeam }
export const createCategory = (body) => client.post('/categories', body);

export const updateCategory = (id, body) => client.put(`/categories/${id}`, body);

export const deleteCategory = (id) => client.delete(`/categories/${id}`);
