import client from './client';

// unit: DAY / WEEK / MONTH, from·to: 'YYYY-MM-DD' (셋 다 생략 가능)
export const getPersonalStats = ({ unit, from, to } = {}) =>
  client.get('/stats/personal', { params: { unit, from, to } });

// 오늘 할 일 + 오늘 일정 요약
export const getDashboard = () => client.get('/dashboard');
