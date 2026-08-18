import { Navigate, Route, Routes } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';

import { useAuth } from './contexts/AuthContext';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CalendarPage from './pages/CalendarPage';
import TodoPage from './pages/TodoPage';
import CategoryPage from './pages/CategoryPage';
import OrgPage from './pages/OrgPage';
import ProjectListPage from './pages/ProjectListPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import StatsPage from './pages/StatsPage';

/**
 * 로그인해야 볼 수 있는 페이지를 감싸는 문지기 컴포넌트.
 *
 * loading을 따로 두는 이유: 새로고침 직후에는 아직 /auth/me 응답이 안 왔으므로
 * user가 null이다. 이때 바로 /login으로 보내버리면 로그인한 사용자도 매번 튕긴다.
 */
function RequireAuth({ children }) {
  const { isLoggedIn, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* 아래는 전부 로그인 필요 + 공통 레이아웃(사이드바/헤더) 안에서 렌더링 */}
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/todos" element={<TodoPage />} />
        <Route path="/projects" element={<ProjectListPage />} />
        <Route path="/projects/:id" element={<ProjectDetailPage />} />
        <Route path="/categories" element={<CategoryPage />} />
        <Route path="/org" element={<OrgPage />} />
        <Route path="/stats" element={<StatsPage />} />
      </Route>

      {/* 없는 경로는 홈으로 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
