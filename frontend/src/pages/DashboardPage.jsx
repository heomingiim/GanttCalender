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
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import TaskDetailDialog from '../components/TaskDetailDialog';
import { PRIORITY, PRIORITY_COLOR, STATUS, STATUS_COLOR } from '../utils/constants';
import { formatDateTime } from '../utils/date';

/** 대시보드 — 오늘 할 일과 오늘 일정 요약. */
export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [todayTodos, setTodayTodos] = useState([]);
  const [todayEvents, setTodayEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await statsApi.getDashboard();
      setTodayTodos(data.todayTodos ?? []);
      setTodayEvents(data.todayEvents ?? []);
    } catch (err) {
      // catch가 없으면 조회 실패와 "정말 비어 있음"이 화면에서 구분되지 않는다.
      toast.apiError(err);
      setTodayTodos([]);
      setTodayEvents([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

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
