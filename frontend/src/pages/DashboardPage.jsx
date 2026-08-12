import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  LinearProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material';

import * as statsApi from '../api/stats';
import * as taskApi from '../api/tasks';
import { useAuth } from '../contexts/AuthContext';
import NotReadyNotice from '../components/NotReadyNotice';
import TaskDetailDialog from '../components/TaskDetailDialog';
import { PRIORITY, PRIORITY_COLOR, STATUS, STATUS_COLOR } from '../utils/constants';
import { endOfToday, formatDateTime, startOfToday } from '../utils/date';

/**
 * 대시보드.
 *
 * GET /api/dashboard 가 아직 없으므로, 404가 나면 이미 구현된 API 두 개로
 * 같은 내용을 직접 조립한다(폴백). 백엔드가 생기면 자동으로 그쪽을 쓴다.
 */
export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [todayTodos, setTodayTodos] = useState([]);
  const [todayEvents, setTodayEvents] = useState([]);
  const [usingFallback, setUsingFallback] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await statsApi.getDashboard();
      setTodayTodos(data.todayTodos ?? []);
      setTodayEvents(data.todayEvents ?? []);
      setUsingFallback(false);
    } catch (err) {
      if (!err.notReady) {
        setLoading(false);
        return;
      }
      // ── 폴백 ── 구현된 API로 같은 정보를 만든다
      setUsingFallback(true);
      const [todos, events] = await Promise.all([
        taskApi.getMyTodos({}).catch(() => []),
        taskApi
          .getCalendarEvents({ from: startOfToday(), to: endOfToday(), scope: 'MY' })
          .catch(() => []),
      ]);
      setTodayTodos(
        todos.filter((t) => t.status !== 'DONE' && t.status !== 'CANCELLED').slice(0, 10)
      );
      setTodayEvents(events);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 0.5 }}>
        안녕하세요, {user?.name} 님
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        오늘의 할 일과 일정입니다.
      </Typography>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {usingFallback && (
        <NotReadyNotice api="GET /api/dashboard">
          <Typography variant="body2" sx={{ mt: 1 }}>
            지금은 <code>/api/tasks</code> 조회 결과로 대신 채워 보여주고 있습니다.
          </Typography>
        </NotReadyNotice>
      )}

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          alignItems: 'start',
        }}
      >
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700}>
              오늘 할 일 ({todayTodos.length})
            </Typography>
          </CardContent>
          <Divider />
          <List dense disablePadding>
            {todayTodos.length === 0 && (
              <ListItem>
                <ListItemText
                  primary="남은 할 일이 없습니다."
                  slotProps={{ primary: { color: 'text.secondary' } }}
                />
              </ListItem>
            )}
            {todayTodos.map((t) => (
              <ListItemButton key={t.id} divider onClick={() => setDetailId(t.id)}>
                <ListItemText
                  primary={t.title}
                  secondary={t.endDate ? `마감 ${formatDateTime(t.endDate)}` : '마감 없음'}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  color={PRIORITY_COLOR[t.priority]}
                  label={PRIORITY[t.priority] ?? t.priority}
                  sx={{ mr: 1 }}
                />
                <Chip
                  size="small"
                  color={STATUS_COLOR[t.status]}
                  label={STATUS[t.status] ?? t.status}
                />
              </ListItemButton>
            ))}
          </List>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700}>
              오늘 일정 ({todayEvents.length})
            </Typography>
          </CardContent>
          <Divider />
          <List dense disablePadding>
            {todayEvents.length === 0 && (
              <ListItem>
                <ListItemText
                  primary="오늘 예정된 일정이 없습니다."
                  slotProps={{ primary: { color: 'text.secondary' } }}
                />
              </ListItem>
            )}
            {todayEvents.map((t) => (
              <ListItemButton key={t.id} divider onClick={() => setDetailId(t.id)}>
                <ListItemText
                  primary={t.title}
                  secondary={
                    t.allDay
                      ? '종일'
                      : `${formatDateTime(t.startDate)} ~ ${formatDateTime(t.endDate)}`
                  }
                />
              </ListItemButton>
            ))}
          </List>
        </Card>
      </Box>

      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
        <Chip label="캘린더 열기" onClick={() => navigate('/calendar')} clickable />
        <Chip label="투두리스트 열기" onClick={() => navigate('/todos')} clickable />
        <Chip label="프로젝트 보기" onClick={() => navigate('/projects')} clickable />
      </Box>

      <TaskDetailDialog
        open={detailId != null}
        taskId={detailId}
        onClose={() => setDetailId(null)}
        onChanged={load}
      />
    </Box>
  );
}
