import client from './client';

// ── STEP 16 / 17 : 통계 & 대시보드 (백엔드 미구현) ────────────
export const getPersonalStats = (year, month) =>
  client.get('/stats/personal', { params: { year, month } });

export const getDashboard = () => client.get('/dashboard');
