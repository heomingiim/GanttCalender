import client from './client';

// unit: DAY / WEEK / MONTH, from·to: 'YYYY-MM-DD' (셋 다 생략 가능)
export const getPersonalStats = ({ unit, from, to } = {}) =>
  client.get('/stats/personal', { params: { unit, from, to } });

// ── 대시보드 (백엔드 미구현) ─────────────────────────
export const getDashboard = () => client.get('/dashboard');
