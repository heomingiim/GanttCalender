import client from './client';

// 로그인 / 로그아웃
export const login = (employeeNumber) =>
  client.post('/auth/login', { employeeNumber });

export const logout = () => client.post('/auth/logout');

export const getMe = () => client.get('/auth/me');
