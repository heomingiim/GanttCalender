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
  Typography,
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ChecklistIcon from '@mui/icons-material/Checklist';
import FolderIcon from '@mui/icons-material/Folder';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AssignmentIcon from '@mui/icons-material/Assignment';
import EventIcon from '@mui/icons-material/Event';

import * as statsApi from '../api/stats';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import TaskDetailDialog from '../components/TaskDetailDialog';
import TaskFormDialog from '../components/TaskFormDialog';
import { PRIORITY, PRIORITY_COLOR, STATUS, STATUS_COLOR } from '../utils/constants';
import { formatDateTime } from '../utils/date';

const QuickLink = ({ icon, label, color, onClick }) => (
  <Box
    onClick={onClick}
    sx={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
      p: 2, borderRadius: 2, cursor: 'pointer', minWidth: 80,
      bgcolor: '#fff', border: '1px solid #e8eaed',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      transition: 'all 0.15s',
      '&:hover': { boxShadow: '0 3px 10px rgba(0,0,0,0.1)', transform: 'translateY(-1px)' },
    }}
  >
    <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {icon}
    </Box>
    <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', whiteSpace: 'nowrap' }}>
      {label}
    </Typography>
  </Box>
);

const StatBadge = ({ label, value, color = 'text.primary' }) => (
  <Box sx={{ textAlign: 'center', px: 2 }}>
    <Typography variant="h5" fontWeight={800} color={color} sx={{ lineHeight: 1.2 }}>
      {value}
    </Typography>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
  </Box>
);

const SectionCard = ({ title, icon, count, children }) => (
  <Card sx={{ display: 'flex', flexDirection: 'column' }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2.5, py: 1.75 }}>
      <Box sx={{ color: 'primary.light', display: 'flex' }}>{icon}</Box>
      <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>{title}</Typography>
      <Chip label={count} size="small" sx={{ bgcolor: '#f0f4f5', color: 'text.secondary', fontWeight: 700 }} />
    </Box>
    <Divider />
    <List dense disablePadding sx={{ flexGrow: 1 }}>
      {children}
    </List>
  </Card>
);

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
      toast.apiError(err);
      setTodayTodos([]);
      setTodayEvents([]);
      setTodayWbsTasks([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

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

  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });

  return (
    <Box>
      {loading && <LinearProgress sx={{ mb: 2, mx: -3, mt: -3 }} />}

      {/* 환영 헤더 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ mb: 0.25 }}>
          안녕하세요, <strong>{user?.name}</strong> 님
        </Typography>
        <Typography variant="body2" color="text.secondary">{today}</Typography>
      </Box>

      {/* 빠른 접근 + 통계 요약 */}
      <Card sx={{ mb: 3, p: 0, overflow: 'visible' }}>
        <CardContent sx={{ display: 'flex', gap: 0, alignItems: 'stretch', p: '0 !important', flexWrap: 'wrap' }}>
          {/* 유저 정보 */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, px: 2.5, py: 2, minWidth: 220 }}>
            <Avatar sx={{ width: 44, height: 44, bgcolor: 'primary.main', fontSize: 18, flexShrink: 0 }}>
              {user?.name?.charAt(0) ?? '?'}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography fontWeight={700} sx={{ fontSize: '0.9rem', lineHeight: 1.3 }} noWrap>
                {user?.name}{user?.positionRank ? ` ${user.positionRank}` : ''}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                {user?.departmentName ?? '부서 없음'}
              </Typography>
              {user?.employeeNumber && (
                <Typography variant="caption" color="text.disabled" noWrap sx={{ display: 'block' }}>
                  {user.employeeNumber}
                </Typography>
              )}
            </Box>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ my: 2 }} />

          {/* 오늘 통계 */}
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, justifyContent: 'center', flexWrap: 'wrap', p: 2 }}>
            <StatBadge label="오늘 할 일" value={todayTodos.length} color="primary.main" />
            <Divider orientation="vertical" flexItem sx={{ my: 1.5 }} />
            <StatBadge label="오늘 일정" value={todayEvents.length} color="primary.main" />
            <Divider orientation="vertical" flexItem sx={{ my: 1.5 }} />
            <StatBadge label="WBS 작업" value={todayWbsTasks.length} color="primary.main" />
            <Divider orientation="vertical" flexItem sx={{ my: 1.5 }} />
            <StatBadge
              label="마감 지남"
              value={urgentItems.filter((t) => t.urgency === 'OVERDUE').length}
              color={urgentItems.some((t) => t.urgency === 'OVERDUE') ? 'error.main' : 'text.secondary'}
            />
            <Divider orientation="vertical" flexItem sx={{ my: 1.5 }} />
            <StatBadge
              label="오늘 마감"
              value={urgentItems.filter((t) => t.urgency === 'TODAY').length}
              color={urgentItems.some((t) => t.urgency === 'TODAY') ? 'warning.main' : 'text.secondary'}
            />
          </Box>

          <Divider orientation="vertical" flexItem sx={{ my: 2 }} />

          {/* 빠른 접근 */}
          <Box sx={{ display: 'flex', gap: 2, p: 2.5, flexWrap: 'wrap' }}>
            <QuickLink
              icon={<CalendarMonthIcon sx={{ color: '#fff', fontSize: 20 }} />}
              label="캘린더"
              color="#3AAEA9"
              onClick={() => navigate('/calendar')}
            />
            <QuickLink
              icon={<ChecklistIcon sx={{ color: '#fff', fontSize: 20 }} />}
              label="투두리스트"
              color="#567C83"
              onClick={() => navigate('/todos')}
            />
            <QuickLink
              icon={<FolderIcon sx={{ color: '#fff', fontSize: 20 }} />}
              label="프로젝트"
              color="#A2D5AB"
              onClick={() => navigate('/projects')}
            />
          </Box>
        </CardContent>
      </Card>

      {/* 콘텐츠 위젯 그리드 */}
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>

        {/* 오늘 할 일 */}
        <SectionCard title="오늘 할 일" icon={<ChecklistIcon fontSize="small" />} count={todayTodos.length}>
          {todayTodos.length === 0 && (
            <ListItem><ListItemText primary="남은 할 일이 없습니다." slotProps={{ primary: { color: 'text.secondary', fontSize: '0.875rem' } }} /></ListItem>
          )}
          {todayTodos.map((t) => (
            <ListItemButton key={t.id} divider onClick={() => setDetailId(t.id)} sx={{ py: 1.25, borderRadius: 0 }}>
              <ListItemText
                primary={t.title}
                secondary={t.startDate || t.endDate ? `${formatDateTime(t.startDate)} ~ ${formatDateTime(t.endDate)}` : '기간 없음'}
                slotProps={{ primary: { fontSize: '0.875rem' }, secondary: { fontSize: '0.75rem' } }}
              />
              <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                <Chip size="small" variant="outlined" color={PRIORITY_COLOR[t.priority]} label={PRIORITY[t.priority] ?? t.priority} />
                <Chip size="small" color={STATUS_COLOR[t.status]} label={STATUS[t.status] ?? t.status} />
              </Box>
            </ListItemButton>
          ))}
        </SectionCard>

        {/* 오늘 일정 */}
        <SectionCard title="오늘 일정" icon={<EventIcon fontSize="small" />} count={todayEvents.length}>
          {todayEvents.length === 0 && (
            <ListItem><ListItemText primary="오늘 예정된 일정이 없습니다." slotProps={{ primary: { color: 'text.secondary', fontSize: '0.875rem' } }} /></ListItem>
          )}
          {todayEvents.map((t) => (
            <ListItemButton key={t.id} divider onClick={() => setDetailId(t.id)} sx={{ py: 1.25, borderRadius: 0 }}>
              <ListItemText
                primary={t.title}
                secondary={t.allDay ? '종일' : `${formatDateTime(t.startDate)} ~ ${formatDateTime(t.endDate)}`}
                slotProps={{ primary: { fontSize: '0.875rem' }, secondary: { fontSize: '0.75rem' } }}
              />
              <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                <Chip size="small" color={STATUS_COLOR[t.status]} label={STATUS[t.status] ?? t.status} />
              </Box>
            </ListItemButton>
          ))}
        </SectionCard>

        {/* 마감 임박·지남 */}
        <SectionCard title="마감 임박·지남" icon={<WarningAmberIcon fontSize="small" />} count={urgentItems.length}>
          {urgentItems.length === 0 && (
            <ListItem><ListItemText primary="마감 임박 항목이 없습니다." slotProps={{ primary: { color: 'text.secondary', fontSize: '0.875rem' } }} /></ListItem>
          )}
          {urgentItems.map((t) => (
            <ListItemButton key={t.id} divider onClick={() => setDetailId(t.id)} sx={{ py: 1.25, borderRadius: 0 }}>
              <ListItemText
                primary={t.title}
                secondary={t.startDate || t.endDate ? `${formatDateTime(t.startDate)} ~ ${formatDateTime(t.endDate)}` : '마감 없음'}
                slotProps={{ primary: { fontSize: '0.875rem' }, secondary: { fontSize: '0.75rem' } }}
              />
              <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                <Chip
                  size="small"
                  color="error"
                  variant={t.urgency === 'OVERDUE' ? 'filled' : 'outlined'}
                  label={t.urgency === 'OVERDUE' ? '마감 지남' : '오늘 마감'}
                  sx={{ fontWeight: 700 }}
                />
                <Chip size="small" color={STATUS_COLOR[t.status]} label={STATUS[t.status] ?? t.status} />
              </Box>
            </ListItemButton>
          ))}
        </SectionCard>

        {/* 오늘 WBS 작업 */}
        <SectionCard title="오늘 WBS 작업" icon={<AssignmentIcon fontSize="small" />} count={todayWbsTasks.length}>
          {todayWbsTasks.length === 0 && (
            <ListItem><ListItemText primary="오늘 걸쳐 있는 WBS 작업이 없습니다." slotProps={{ primary: { color: 'text.secondary', fontSize: '0.875rem' } }} /></ListItem>
          )}
          {todayWbsTasks.map((t) => (
            <ListItemButton key={t.id} divider onClick={() => setDetailId(t.id)} sx={{ py: 1.25, borderRadius: 0 }}>
              <ListItemText
                primary={t.title}
                secondary={t.startDate || t.endDate ? `${formatDateTime(t.startDate)} ~ ${formatDateTime(t.endDate)}` : '기간 없음'}
                slotProps={{ primary: { fontSize: '0.875rem' }, secondary: { fontSize: '0.75rem' } }}
              />
              <Chip size="small" color={STATUS_COLOR[t.status]} label={STATUS[t.status] ?? t.status} />
            </ListItemButton>
          ))}
        </SectionCard>

      </Box>

      <TaskFormDialog open={formOpen} onClose={() => setFormOpen(false)} onSaved={load} task={editingTask} />
      <TaskDetailDialog
        open={detailId != null}
        taskId={detailId}
        onClose={() => setDetailId(null)}
        onChanged={load}
        allowDeleteWbs={false}
        onEdit={(task) => { setDetailId(null); setEditingTask(task); setFormOpen(true); }}
      />
    </Box>
  );
}
