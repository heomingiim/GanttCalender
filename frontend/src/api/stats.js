import client from './client';

// unit: DAY / WEEK / MONTH, from·to: 'YYYY-MM-DD' (셋 다 생략 가능), scope: MY / TEAM
export const getPersonalStats = ({ unit, from, to, scope } = {}) =>
  client.get('/stats/personal', { params: { unit, from, to, scope } });

// 오늘 할 일 + 오늘 일정 요약
export const getDashboard = () => client.get('/dashboard');
