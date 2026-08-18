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
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
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
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        position: 'relative',
        zIndex: isDragging ? 1 : 'auto',
      }}
      hover
      sx={
        urgency === 'OVERDUE'
          ? { bgcolor: 'rgba(211, 47, 47, 0.14)' }
          : urgency === 'TODAY'
            ? { bgcolor: 'rgba(211, 47, 47, 0.08)' }
            : undefined
      }
    >
      <TableCell sx={{ p: 0, width: 40 }}>
        <IconButton
          size="small"
          disabled={dragDisabled}
          {...attributes}
          {...listeners}
          sx={{ cursor: dragDisabled ? 'default' : isDragging ? 'grabbing' : 'grab', color: 'text.disabled' }}
        >
          <DragIndicatorIcon fontSize="small" />
        </IconButton>
      </TableCell>
      <TableCell padding="checkbox">
        <Checkbox
          checked={done}
          disabled={!mine}
          onChange={() => onToggle(todo)}
          onClick={(e) => e.stopPropagation()}
        />
      </TableCell>
      <TableCell
        onClick={() => onDetail(todo.id)}
        sx={{
          cursor: 'pointer',
          textDecoration: done ? 'line-through' : 'none',
          color: done ? 'text.disabled' : 'text.primary',
        }}
      >
        {todo.title}
      </TableCell>
      <TableCell>
        <Chip
          size="small"
          variant="outlined"
          label={todo.taskType === 'TODO' ? '개인' : (TASK_TYPE[todo.taskType] ?? todo.taskType)}
        />
      </TableCell>
      <TableCell>
        <Chip size="small" color={STATUS_COLOR[todo.status]} label={STATUS[todo.status] ?? todo.status} />
      </TableCell>
      <TableCell>
        <Chip
          size="small"
          variant="outlined"
          color={PRIORITY_COLOR[todo.priority]}
          label={PRIORITY[todo.priority] ?? todo.priority}
        />
      </TableCell>
      <TableCell>{todo.progressRate}%</TableCell>
      <TableCell sx={{ fontSize: 13 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          {todo.startDate || todo.endDate
            ? `${formatDate(todo.startDate)} ~ ${formatDate(todo.endDate)}`
            : '-'}
          {urgency && (
            <Chip
              size="small"
              color="error"
              variant={urgency === 'OVERDUE' ? 'filled' : 'outlined'}
              label={urgency === 'OVERDUE' ? '마감 지남' : '오늘 마감'}
              sx={{ fontWeight: 700 }}
            />
          )}
        </Box>
      </TableCell>
      <TableCell>
        {todo.taskType === 'WBS_TASK' ? (
          <Tooltip title="내 목록에서만 빼기 (프로젝트에는 남습니다)">
            <IconButton size="small" onClick={() => onDelete(todo)}>
              <PlaylistRemoveIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : (
          mine && (
            <IconButton size="small" onClick={() => onDelete(todo)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          )
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

  // null이면 드래그 순서(기본순) 그대로. 컬럼 헤더를 클릭하면 그 기준으로 정렬한다
  const [sortBy, setSortBy] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [typeFilter, setTypeFilter] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

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
    setTodos((prev) =>
      prev.map((t) =>
        t.id === todo.id
          ? { ...t, status: nextStatus, progressRate: nextStatus === 'DONE' ? 100 : 0 }
          : t
      )
    );
    try {
      await taskApi.changeStatus(todo.id, nextStatus);
    } catch (err) {
      setTodos(snapshot);
      toast.apiError(err);
    }
  };

  const handleDelete = async () => {
    try {
      // WBS 작업은 프로젝트 데이터라 실제로 지우면 안 되고, 내 담당에서만 빠진다
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

  const handleSearch = (event) => {
    event.preventDefault();
    setKeyword(searchInput);
  };

  const handleSortClick = (key) => {
    if (sortBy !== key) {
      setSortBy(key);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else {
      setSortBy(null); // 다시 누르면 기본순(드래그 순서)으로 복귀
    }
  };

  const displayTodos = useMemo(() => {
    const filtered = typeFilter ? todos.filter((t) => t.taskType === typeFilter) : todos;
    if (!sortBy) return filtered;
    const accessor = SORT_ACCESSOR[sortBy];
    const sign = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      if (av < bv) return -1 * sign;
      if (av > bv) return 1 * sign;
      return 0;
    });
  }, [todos, sortBy, sortDir, typeFilter]);

  const allTodoIds = todos.map((t) => t.id);

  const handleDragEnd = async ({ active, over }) => {
    if (sortBy) return; // 정렬 중엔 드래그로 순서를 바꾸지 않는다
    if (!over || active.id === over.id) return;
    const oldIndex = allTodoIds.indexOf(active.id);
    const newIndex = allTodoIds.indexOf(over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const nextIds = arrayMove(allTodoIds, oldIndex, newIndex);
    const order = new Map(nextIds.map((id, i) => [id, i]));
    const snapshot = todos;

    setTodos((prev) => [...prev].sort((a, b) => order.get(a.id) - order.get(b.id)));

    const editableIds = nextIds.filter((id) => {
      const t = todos.find((x) => x.id === id);
      return t && t.canEdit !== false && t.creatorId === user?.id;
    });

    try {
      if (editableIds.length > 0) {
        await taskApi.reorderTasks(editableIds);
      }
    } catch (err) {
      setTodos(snapshot);
      toast.apiError(err);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>
          투두리스트
        </Typography>

        <TextField
          select
          size="small"
          label="상태"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          sx={{ minWidth: 120, '& .MuiInputBase-root': { height: 40 } }}
        >
          <MenuItem value="">전체</MenuItem>
          {Object.entries(STATUS).map(([code, label]) => (
            <MenuItem key={code} value={code}>{label}</MenuItem>
          ))}
        </TextField>

        <TextField
          select
          size="small"
          label="프로젝트"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          sx={{ minWidth: 160, '& .MuiInputBase-root': { height: 40 } }}
        >
          <MenuItem value="">전체</MenuItem>
          {projects.map((p) => (
            <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
          ))}
        </TextField>

        <TextField
          select
          size="small"
          label="구분"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          sx={{ minWidth: 120, '& .MuiInputBase-root': { height: 40 } }}
        >
          <MenuItem value="">전체</MenuItem>
          {Object.entries(TASK_TYPE).filter(([code]) => code !== 'EVENT').map(([code, label]) => (
            <MenuItem key={code} value={code}>{label}</MenuItem>
          ))}
        </TextField>

        <DateRangePickerField
          from={fromDate}
          to={toDate}
          onChange={(f, t) => { setFromDate(f); setToDate(t); }}
          placeholder="기간"
        />

        <Box component="form" onSubmit={handleSearch}>
          <TextField
            size="small"
            placeholder="제목 검색"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            sx={pillSearchSx}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => { setEditingTask(null); setFormOpen(true); }}
        >
          할 일 추가
        </Button>
      </Box>

      {loading && <LinearProgress sx={{ mb: 1 }} />}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={displayTodos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell width={40} />
                  <TableCell padding="checkbox" />
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === 'title'}
                      direction={sortBy === 'title' ? sortDir : 'asc'}
                      onClick={() => handleSortClick('title')}
                    >
                      제목
                    </TableSortLabel>
                  </TableCell>
                  <TableCell width={90}>
                    <TableSortLabel
                      active={sortBy === 'type'}
                      direction={sortBy === 'type' ? sortDir : 'asc'}
                      onClick={() => handleSortClick('type')}
                    >
                      구분
                    </TableSortLabel>
                  </TableCell>
                  <TableCell width={90}>
                    <TableSortLabel
                      active={sortBy === 'status'}
                      direction={sortBy === 'status' ? sortDir : 'asc'}
                      onClick={() => handleSortClick('status')}
                    >
                      상태
                    </TableSortLabel>
                  </TableCell>
                  <TableCell width={90}>
                    <TableSortLabel
                      active={sortBy === 'priority'}
                      direction={sortBy === 'priority' ? sortDir : 'asc'}
                      onClick={() => handleSortClick('priority')}
                    >
                      우선순위
                    </TableSortLabel>
                  </TableCell>
                  <TableCell width={80}>
                    <TableSortLabel
                      active={sortBy === 'progress'}
                      direction={sortBy === 'progress' ? sortDir : 'asc'}
                      onClick={() => handleSortClick('progress')}
                    >
                      진행률
                    </TableSortLabel>
                  </TableCell>
                  <TableCell width={260}>
                    <TableSortLabel
                      active={sortBy === 'dueDate'}
                      direction={sortBy === 'dueDate' ? sortDir : 'asc'}
                      onClick={() => handleSortClick('dueDate')}
                    >
                      기간
                    </TableSortLabel>
                  </TableCell>
                  <TableCell width={60} />
                </TableRow>
              </TableHead>
              <TableBody>
                {displayTodos.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                      할 일이 없습니다.
                    </TableCell>
                  </TableRow>
                )}
                {displayTodos.map((todo) => (
                  <SortableTodoRow
                    key={todo.id}
                    todo={todo}
                    mine={todo.creatorId === user?.id}
                    dragDisabled={!!sortBy}
                    onToggle={handleToggle}
                    onDetail={setDetailId}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </SortableContext>
      </DndContext>

      <TaskFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={load}
        task={editingTask}
        categories={categories}
        defaultType="TODO"
        lockType
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

      <ConfirmDialog
        open={deleteTarget != null}
        message={
          deleteTarget?.taskType === 'WBS_TASK'
            ? `'${deleteTarget?.title}' 을(를) 내 목록에서만 뺄까요? 프로젝트의 WBS 작업 자체는 그대로 남습니다.`
            : `'${deleteTarget?.title}' 을(를) 삭제할까요?`
        }
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
