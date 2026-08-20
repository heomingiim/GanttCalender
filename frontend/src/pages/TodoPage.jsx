import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import PlaylistRemoveIcon from '@mui/icons-material/PlaylistRemove';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import ChecklistIcon from '@mui/icons-material/Checklist';

import * as taskApi from '../api/tasks';
import { listCategories } from '../api/categories';
import { listProjects } from '../api/projects';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import TaskFormDialog from '../components/TaskFormDialog';
import TaskDetailDialog from '../components/TaskDetailDialog';
import ConfirmDialog from '../components/ConfirmDialog';
import DateRangePickerField from '../components/DateRangePickerField';
import { PRIORITY, PRIORITY_COLOR, STATUS, STATUS_COLOR, TASK_TYPE } from '../utils/constants';
import { formatDate, isSameDay } from '../utils/date';
import { pillSearchSx } from '../utils/uiStyles';

const SORT_ACCESSOR = {
  title: (t) => t.title ?? '',
  type: (t) => t.taskType ?? '',
  status: (t) => t.status ?? '',
  priority: (t) => t.priority ?? '',
  progress: (t) => t.progressRate ?? 0,
  dueDate: (t) => t.endDate ?? '',
};

function dueUrgency(todo) {
  if (!todo.endDate || ['DONE', 'CANCELLED'].includes(todo.status)) return null;
  const today = new Date();
  if (isSameDay(todo.endDate, today)) return 'TODAY';
  if (new Date(todo.endDate) < today) return 'OVERDUE';
  return null;
}

function SortableTodoRow({ todo, mine, dragDisabled, onToggle, onDetail, onDelete }) {
  const done = todo.status === 'DONE';
  const urgency = dueUrgency(todo);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: todo.id,
    disabled: dragDisabled,
  });

  return (
    <TableRow
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, position: 'relative', zIndex: isDragging ? 1 : 'auto' }}
      sx={urgency === 'OVERDUE' ? { bgcolor: 'rgba(211,47,47,0.06)' } : urgency === 'TODAY' ? { bgcolor: 'rgba(255,152,0,0.06)' } : undefined}
    >
      <TableCell sx={{ p: 0, width: 36 }}>
        <IconButton size="small" disabled={dragDisabled} {...attributes} {...listeners}
          sx={{ cursor: dragDisabled ? 'default' : isDragging ? 'grabbing' : 'grab', color: 'text.disabled' }}>
          <DragIndicatorIcon fontSize="small" />
        </IconButton>
      </TableCell>
      <TableCell padding="checkbox">
        <Checkbox checked={done} disabled={!mine} onChange={() => onToggle(todo)} onClick={(e) => e.stopPropagation()} size="small" />
      </TableCell>
      <TableCell onClick={() => onDetail(todo.id)} sx={{ cursor: 'pointer', textDecoration: done ? 'line-through' : 'none', color: done ? 'text.disabled' : 'text.primary', fontWeight: 500 }}>
        {todo.title}
      </TableCell>
      <TableCell>
        <Chip size="small" variant="outlined" label={todo.taskType === 'TODO' ? '개인' : (TASK_TYPE[todo.taskType] ?? todo.taskType)} />
      </TableCell>
      <TableCell>
        <Chip size="small" color={STATUS_COLOR[todo.status]} label={STATUS[todo.status] ?? todo.status} />
      </TableCell>
      <TableCell>
        <Chip size="small" variant="outlined" color={PRIORITY_COLOR[todo.priority]} label={PRIORITY[todo.priority] ?? todo.priority} />
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LinearProgress variant="determinate" value={todo.progressRate} sx={{ flexGrow: 1, height: 5 }} />
          <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>{todo.progressRate}%</Typography>
        </Box>
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="body2" sx={{ color: urgency ? 'error.main' : 'text.secondary' }}>
            {todo.startDate || todo.endDate ? `${formatDate(todo.startDate)} ~ ${formatDate(todo.endDate)}` : '-'}
          </Typography>
          {urgency && (
            <Chip size="small" color="error" variant={urgency === 'OVERDUE' ? 'filled' : 'outlined'}
              label={urgency === 'OVERDUE' ? '마감 지남' : '오늘'} sx={{ fontWeight: 700 }} />
          )}
        </Box>
      </TableCell>
      <TableCell sx={{ p: 0.5 }}>
        {todo.taskType === 'WBS_TASK' ? (
          <Tooltip title="내 목록에서만 빼기">
            <IconButton size="small" onClick={() => onDelete(todo)}><PlaylistRemoveIcon fontSize="small" /></IconButton>
          </Tooltip>
        ) : (
          mine && <IconButton size="small" onClick={() => onDelete(todo)}><DeleteIcon fontSize="small" /></IconButton>
        )}
      </TableCell>
    </TableRow>
  );
}

export default function TodoPage() {
  const toast = useToast();
  const { user } = useAuth();

  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [projectId, setProjectId] = useState('');
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [categories, setCategories] = useState([]);
  const [projects, setProjects] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [sortBy, setSortBy] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [typeFilter, setTypeFilter] = useState('');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await taskApi.getMyTodos({ status, projectId, keyword, from: fromDate, to: toDate });
      setTodos(Array.isArray(list) ? list : []);
    } catch (err) {
      toast.apiError(err);
      setTodos([]);
    } finally {
      setLoading(false);
    }
  }, [status, projectId, keyword, fromDate, toDate, toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    listCategories().then(setCategories).catch(() => setCategories([]));
    listProjects().then(setProjects).catch(() => setProjects([]));
  }, []);

  const handleToggle = async (todo) => {
    const nextStatus = todo.status === 'DONE' ? 'TODO' : 'DONE';
    const snapshot = todos;
    setTodos((prev) => prev.map((t) => t.id === todo.id ? { ...t, status: nextStatus, progressRate: nextStatus === 'DONE' ? 100 : 0 } : t));
    try {
      await taskApi.changeStatus(todo.id, nextStatus);
    } catch (err) {
      setTodos(snapshot);
      toast.apiError(err);
    }
  };

  const handleDelete = async () => {
    try {
      if (deleteTarget.taskType === 'WBS_TASK') {
        await taskApi.unassignSelf(deleteTarget.id);
        toast.success('내 목록에서 제외했습니다.');
      } else {
        await taskApi.deleteTask(deleteTarget.id);
        toast.success('삭제했습니다.');
      }
      load();
    } catch (err) {
      toast.apiError(err);
    }
  };

  const handleSearch = (e) => { e.preventDefault(); setKeyword(searchInput); };

  const handleSortClick = (key) => {
    if (sortBy !== key) { setSortBy(key); setSortDir('asc'); }
    else if (sortDir === 'asc') setSortDir('desc');
    else setSortBy(null);
  };

  const displayTodos = useMemo(() => {
    const filtered = typeFilter ? todos.filter((t) => t.taskType === typeFilter) : todos;
    if (!sortBy) return filtered;
    const accessor = SORT_ACCESSOR[sortBy];
    const sign = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = accessor(a); const bv = accessor(b);
      if (av < bv) return -1 * sign;
      if (av > bv) return 1 * sign;
      return 0;
    });
  }, [todos, sortBy, sortDir, typeFilter]);

  const allTodoIds = todos.map((t) => t.id);

  const handleDragEnd = async ({ active, over }) => {
    if (sortBy || !over || active.id === over.id) return;
    const oldIndex = allTodoIds.indexOf(active.id);
    const newIndex = allTodoIds.indexOf(over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const nextIds = arrayMove(allTodoIds, oldIndex, newIndex);
    const order = new Map(nextIds.map((id, i) => [id, i]));
    const snapshot = todos;
    setTodos((prev) => [...prev].sort((a, b) => order.get(a.id) - order.get(b.id)));
    const editableIds = nextIds.filter((id) => { const t = todos.find((x) => x.id === id); return t && t.canEdit !== false && t.creatorId === user?.id; });
    try {
      if (editableIds.length > 0) await taskApi.reorderTasks(editableIds);
    } catch (err) {
      setTodos(snapshot);
      toast.apiError(err);
    }
  };

  const doneCount = todos.filter((t) => t.status === 'DONE').length;

  return (
    <Box>
      {/* 페이지 헤더 카드 */}
      <Box sx={{
        bgcolor: 'background.paper', border: '1px solid #e2e5ea',
        borderRadius: 2.5, mb: 2, overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
      }}>
        {/* 상단 헤더 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 2, borderBottom: '1px solid #e2e5ea' }}>
          <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: '#567C83', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ChecklistIcon sx={{ color: '#fff', fontSize: 20 }} />
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle1" fontWeight={700}>투두리스트</Typography>
            <Typography variant="caption" color="text.secondary">
              전체 {todos.length}개 · 완료 {doneCount}개
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} size="small"
            onClick={() => { setEditingTask(null); setFormOpen(true); }}>
            할 일 추가
          </Button>
        </Box>

        {/* 필터 툴바 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', px: 2, py: 1.5, bgcolor: '#f8f9fb' }}>
          <TextField select size="small" label="상태" value={status} onChange={(e) => setStatus(e.target.value)}
            sx={{ minWidth: 110, '& .MuiInputBase-root': { height: 34, bgcolor: '#fff' } }}>
            <MenuItem value="">전체</MenuItem>
            {Object.entries(STATUS).map(([code, label]) => <MenuItem key={code} value={code}>{label}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="프로젝트" value={projectId} onChange={(e) => setProjectId(e.target.value)}
            sx={{ minWidth: 150, '& .MuiInputBase-root': { height: 34, bgcolor: '#fff' } }}>
            <MenuItem value="">전체</MenuItem>
            {projects.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="구분" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
            sx={{ minWidth: 110, '& .MuiInputBase-root': { height: 34, bgcolor: '#fff' } }}>
            <MenuItem value="">전체</MenuItem>
            {Object.entries(TASK_TYPE).filter(([code]) => code !== 'EVENT').map(([code, label]) => <MenuItem key={code} value={code}>{label}</MenuItem>)}
          </TextField>
          <DateRangePickerField from={fromDate} to={toDate} onChange={(f, t) => { setFromDate(f); setToDate(t); }} placeholder="기간" />
          <Box component="form" onSubmit={handleSearch} sx={{ ml: 'auto' }}>
            <TextField size="small" placeholder="제목 검색" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
              sx={{ ...pillSearchSx, '& .MuiInputBase-root': { height: 34, bgcolor: '#fff' } }}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }} />
          </Box>
        </Box>

        {loading && <LinearProgress />}
      </Box>

      {/* 테이블 */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={displayTodos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <TableContainer sx={{ bgcolor: 'background.paper', borderRadius: 2.5, border: '1px solid #e2e5ea', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell width={36} />
                  <TableCell padding="checkbox" />
                  <TableCell><TableSortLabel active={sortBy === 'title'} direction={sortBy === 'title' ? sortDir : 'asc'} onClick={() => handleSortClick('title')}>제목</TableSortLabel></TableCell>
                  <TableCell width={80}><TableSortLabel active={sortBy === 'type'} direction={sortBy === 'type' ? sortDir : 'asc'} onClick={() => handleSortClick('type')}>구분</TableSortLabel></TableCell>
                  <TableCell width={90}><TableSortLabel active={sortBy === 'status'} direction={sortBy === 'status' ? sortDir : 'asc'} onClick={() => handleSortClick('status')}>상태</TableSortLabel></TableCell>
                  <TableCell width={90}><TableSortLabel active={sortBy === 'priority'} direction={sortBy === 'priority' ? sortDir : 'asc'} onClick={() => handleSortClick('priority')}>우선순위</TableSortLabel></TableCell>
                  <TableCell width={140}><TableSortLabel active={sortBy === 'progress'} direction={sortBy === 'progress' ? sortDir : 'asc'} onClick={() => handleSortClick('progress')}>진행률</TableSortLabel></TableCell>
                  <TableCell width={240}><TableSortLabel active={sortBy === 'dueDate'} direction={sortBy === 'dueDate' ? sortDir : 'asc'} onClick={() => handleSortClick('dueDate')}>기간</TableSortLabel></TableCell>
                  <TableCell width={50} />
                </TableRow>
              </TableHead>
              <TableBody>
                {displayTodos.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                      <ChecklistIcon sx={{ fontSize: 36, opacity: 0.2, mb: 1, display: 'block', mx: 'auto' }} />
                      할 일이 없습니다.
                    </TableCell>
                  </TableRow>
                )}
                {displayTodos.map((todo) => (
                  <SortableTodoRow key={todo.id} todo={todo} mine={todo.creatorId === user?.id}
                    dragDisabled={!!sortBy} onToggle={handleToggle} onDetail={setDetailId} onDelete={setDeleteTarget} />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </SortableContext>
      </DndContext>

      <TaskFormDialog open={formOpen} onClose={() => setFormOpen(false)} onSaved={load} task={editingTask} categories={categories} defaultType="TODO" lockType />
      <TaskDetailDialog open={detailId != null} taskId={detailId} onClose={() => setDetailId(null)} onChanged={load} allowDeleteWbs={false}
        onEdit={(task) => { setDetailId(null); setEditingTask(task); setFormOpen(true); }} />
      <ConfirmDialog open={deleteTarget != null}
        message={deleteTarget?.taskType === 'WBS_TASK' ? `'${deleteTarget?.title}' 을(를) 내 목록에서만 뺄까요?` : `'${deleteTarget?.title}' 을(를) 삭제할까요?`}
        onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />
    </Box>
  );
}
