import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Avatar,
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
  Stack,
  Typography,
} from '@mui/material';

import * as statsApi from '../api/stats';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import TaskDetailDialog from '../components/TaskDetailDialog';
import TaskFormDialog from '../components/TaskFormDialog';
import { PRIORITY, PRIORITY_COLOR, STATUS, STATUS_COLOR } from '../utils/constants';
import { formatDateTime } from '../utils/date';

/** 대시보드 — 오늘 할 일과 오늘 일정 요약. */
export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [todayTodos, setTodayTodos] = useState([]);
  const [todayEvents, setTodayEvents] = useState([]);
  const [todayWbsTasks, setTodayWbsTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await statsApi.getDashboard();
      setTodayTodos(data.todayTodos ?? []);
      setTodayEvents(data.todayEvents ?? []);
      setTodayWbsTasks(data.todayWbsTasks ?? []);
    } catch (err) {
      // catch가 없으면 조회 실패와 "정말 비어 있음"이 화면에서 구분되지 않는다.
      toast.apiError(err);
      setTodayTodos([]);
      setTodayEvents([]);
      setTodayWbsTasks([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const totalToday = todayTodos.length + todayEvents.length + todayWbsTasks.length;

  const urgentItems = useMemo(() => {
    const now = new Date();
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const seen = new Set();
    const items = [];
    for (const t of [...todayTodos, ...todayWbsTasks]) {
      if (seen.has(t.id) || !t.endDate || ['DONE', 'CANCELLED'].includes(t.status)) continue;
      seen.add(t.id);
      const end = new Date(t.endDate);
      if (end < now) items.push({ ...t, urgency: 'OVERDUE' });
      else if (end <= todayEnd) items.push({ ...t, urgency: 'TODAY' });
    }
    return items.sort((a, b) => new Date(a.endDate) - new Date(b.endDate));
  }, [todayTodos, todayWbsTasks]);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5 }}>
            안녕하세요, {user?.name} 님
          </Typography>
          <Typography variant="body2" color="text.secondary">
            오늘의 할 일과 일정입니다.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip label="캘린더 열기" onClick={() => navigate('/calendar')} clickable />
          <Chip label="투두리스트 열기" onClick={() => navigate('/todos')} clickable />
          <Chip label="프로젝트 보기" onClick={() => navigate('/projects')} clickable />
        </Box>
      </Box>
      <Box sx={{ mb: 2 }} />

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <Card
          variant="outlined"
          sx={{ width: 260, flexShrink: 0, borderRadius: 3, p: 3, textAlign: 'center' }}
        >
          <Avatar
            sx={{
              width: 72,
              height: 72,
              mx: 'auto',
              mb: 1.5,
              bgcolor: 'primary.main',
              fontSize: 28,
            }}
          >
            {user?.name?.charAt(0) ?? '?'}
          </Avatar>
          <Typography variant="h6" fontWeight={700}>
            {user?.name}
            {user?.positionRank ? ` ${user.positionRank}` : ''}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {user?.departmentName ?? '부서 없음'}
          </Typography>

          <Typography variant="h3" color="primary" fontWeight={800} sx={{ lineHeight: 1.2 }}>
            {totalToday}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            오늘의 일정
          </Typography>

          <Divider sx={{ mb: 1.5 }} />

          <Stack spacing={1}>
            {[
              ['오늘 할 일', todayTodos.length],
              ['오늘 일정', todayEvents.length],
              ['오늘 WBS 작업', todayWbsTasks.length],
            ].map(([label, value]) => (
              <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  {label}
                </Typography>
                <Typography variant="body2" fontWeight={700} color={value > 0 ? 'primary' : 'text.secondary'}>
                  {value}
                </Typography>
              </Box>
            ))}
          </Stack>

          <Divider sx={{ my: 1.5 }} />

          <Stack spacing={1}>
            {[
              ['오늘 마감', urgentItems.filter((t) => t.urgency === 'TODAY').length],
              ['마감 지남', urgentItems.filter((t) => t.urgency === 'OVERDUE').length],
            ].map(([label, value]) => (
              <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  {label}
                </Typography>
                <Typography variant="body2" fontWeight={700} color={value > 0 ? 'error' : 'text.secondary'}>
                  {value}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Card>

        <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
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
                  secondary={t.startDate || t.endDate ? `${formatDateTime(t.startDate)} ~ ${formatDateTime(t.endDate)}` : '기간 없음'}
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
            <Typography variant="subtitle1" fontWeight={700} color="error.main">
              오늘마감·지난 ({urgentItems.length})
            </Typography>
          </CardContent>
          <Divider />
          <List dense disablePadding>
            {urgentItems.length === 0 && (
              <ListItem>
                <ListItemText
                  primary="오늘 마감이거나 지난 작업이 없습니다."
                  slotProps={{ primary: { color: 'text.secondary' } }}
                />
              </ListItem>
            )}
            {urgentItems.map((t) => (
              <ListItemButton key={t.id} divider onClick={() => setDetailId(t.id)}>
                <ListItemText
                  primary={t.title}
                  secondary={t.startDate || t.endDate ? `${formatDateTime(t.startDate)} ~ ${formatDateTime(t.endDate)}` : '마감 없음'}
                />
                <Chip
                  size="small"
                  color="error"
                  variant={t.urgency === 'OVERDUE' ? 'filled' : 'outlined'}
                  label={t.urgency === 'OVERDUE' ? '마감 지남' : '오늘 마감'}
                  sx={{ mr: 1, fontWeight: 700 }}
                />
                <Chip size="small" color={STATUS_COLOR[t.status]} label={STATUS[t.status] ?? t.status} />
              </ListItemButton>
            ))}
          </List>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700}>
              오늘 WBS 작업 ({todayWbsTasks.length})
            </Typography>
          </CardContent>
          <Divider />
          <List dense disablePadding>
            {todayWbsTasks.length === 0 && (
              <ListItem>
                <ListItemText
                  primary="오늘 걸쳐 있는 WBS 작업이 없습니다."
                  slotProps={{ primary: { color: 'text.secondary' } }}
                />
              </ListItem>
            )}
            {todayWbsTasks.map((t) => (
              <ListItemButton key={t.id} divider onClick={() => setDetailId(t.id)}>
                <ListItemText
                  primary={t.title}
                  secondary={t.startDate || t.endDate ? `${formatDateTime(t.startDate)} ~ ${formatDateTime(t.endDate)}` : '기간 없음'}
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
        </Box>
        </Box>
      </Box>

      <TaskFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={load}
        task={editingTask}
      />

      <TaskDetailDialog
        open={detailId != null}
        taskId={detailId}
        onClose={() => setDetailId(null)}
        onChanged={load}
        allowDeleteWbs={false}
        onEdit={(task) => {
          setDetailId(null);
          setEditingTask(task);
          setFormOpen(true);
        }}
      />
    </Box>
  );
}
