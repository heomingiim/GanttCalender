import { useCallback, useEffect, useState } from 'react';
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
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

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

function dueUrgency(todo) {
  if (!todo.endDate || ['DONE', 'CANCELLED'].includes(todo.status)) return null;
  const today = new Date();
  if (isSameDay(todo.endDate, today)) return 'TODAY';
  if (new Date(todo.endDate) < today) return 'OVERDUE';
  return null;
}

/**
 * 투두리스트.
 *
 * 볼 만한 부분: 체크박스의 낙관적 업데이트(handleToggle).
 */
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await taskApi.getMyTodos({
        status,
        projectId,
        keyword,
        from: fromDate,
        to: toDate,
      });
      setTodos(Array.isArray(list) ? list : []);
    } catch (err) {
      toast.apiError(err);
      setTodos([]);
    } finally {
      setLoading(false);
    }
  }, [status, projectId, keyword, fromDate, toDate, toast]);

  // status/projectId/keyword가 바뀌면 load 함수가 새로 만들어지고,
  // 그걸 의존성으로 걸어둔 이 effect가 다시 돌면서 재조회한다.
  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    listCategories().then(setCategories).catch(() => setCategories([]));
    listProjects().then(setProjects).catch(() => setProjects([]));
  }, []);

  /**
   * ★ 낙관적 업데이트 ★
   * 체크박스를 누르면 서버 응답을 기다리지 않고 화면부터 바꾼다.
   * 사용자는 즉시 반응을 보고, 실패하면 그때 원래대로 되돌린다.
   * 이걸 안 하면 체크할 때마다 0.2초씩 멈칫하는 느낌이 난다.
   */
  const handleToggle = async (todo) => {
    const nextStatus = todo.status === 'DONE' ? 'TODO' : 'DONE';
    const snapshot = todos; // 롤백용 원본 보관

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
      setTodos(snapshot); // 롤백
      toast.apiError(err);
    }
  };

  const handleDelete = async () => {
    try {
      await taskApi.deleteTask(deleteTarget.id);
      toast.success('삭제했습니다.');
      load();
    } catch (err) {
      toast.apiError(err);
    }
  };

  const handleSearch = (event) => {
    event.preventDefault();
    setKeyword(searchInput);
  };

  const moveRow = async (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= todos.length) return;

    const snapshot = todos;
    const next = [...todos];
    [next[index], next[target]] = [next[target], next[index]];
    setTodos(next);

    try {
      await taskApi.reorderTasks(next.map((t) => t.id));
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
            <MenuItem key={code} value={code}>
              {label}
            </MenuItem>
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
            <MenuItem key={p.id} value={p.id}>
              {p.name}
            </MenuItem>
          ))}
        </TextField>

        <DateRangePickerField
          from={fromDate}
          to={toDate}
          onChange={(f, t) => {
            setFromDate(f);
            setToDate(t);
          }}
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
          onClick={() => {
            setEditingTask(null);
            setFormOpen(true);
          }}
        >
          할 일 추가
        </Button>
      </Box>

      {loading && <LinearProgress sx={{ mb: 1 }} />}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width={64} />
              <TableCell padding="checkbox" />
              <TableCell>제목</TableCell>
              <TableCell width={90}>구분</TableCell>
              <TableCell width={90}>상태</TableCell>
              <TableCell width={90}>우선순위</TableCell>
              <TableCell width={80}>진행률</TableCell>
              <TableCell width={260}>기간</TableCell>
              <TableCell width={60} />
            </TableRow>
          </TableHead>
          <TableBody>
            {todos.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                  할 일이 없습니다.
                </TableCell>
              </TableRow>
            )}

            {todos.map((todo, index) => {
              const done = todo.status === 'DONE';
              // WBS 작업은 담당자로 지정만 되어도 이 목록에 뜬다. 상태 변경·삭제는
              // 작성자만 할 수 있어서(canEdit), 남이 만든 걸 여기서 건드리면 403이 난다.
              const mine = todo.creatorId === user?.id;
              const urgency = dueUrgency(todo);
              return (
                <TableRow
                  key={todo.id}
                  hover
                  sx={
                    urgency === 'OVERDUE'
                      ? { bgcolor: 'rgba(211, 47, 47, 0.14)' }
                      : urgency === 'TODAY'
                        ? { bgcolor: 'rgba(211, 47, 47, 0.08)' }
                        : undefined
                  }
                >
                  <TableCell sx={{ p: 0 }}>
                    <IconButton size="small" disabled={index === 0} onClick={() => moveRow(index, -1)}>
                      <ArrowUpwardIcon fontSize="inherit" />
                    </IconButton>
                    <IconButton
                      size="small"
                      disabled={index === todos.length - 1}
                      onClick={() => moveRow(index, 1)}
                    >
                      <ArrowDownwardIcon fontSize="inherit" />
                    </IconButton>
                  </TableCell>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={done}
                      disabled={!mine}
                      onChange={() => handleToggle(todo)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableCell>
                  <TableCell
                    onClick={() => setDetailId(todo.id)}
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
                    <Chip
                      size="small"
                      color={STATUS_COLOR[todo.status]}
                      label={STATUS[todo.status] ?? todo.status}
                    />
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
                    {mine && (
                      <IconButton size="small" onClick={() => setDeleteTarget(todo)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

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
        onEdit={(task) => {
          setDetailId(null);
          setEditingTask(task);
          setFormOpen(true);
        }}
      />

      <ConfirmDialog
        open={deleteTarget != null}
        message={`'${deleteTarget?.title}' 을(를) 삭제할까요?`}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
