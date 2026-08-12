import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';

import * as projectApi from '../api/projects';
import * as taskApi from '../api/tasks';
import { listCategories } from '../api/categories';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import TaskFormDialog from '../components/TaskFormDialog';
import TaskDetailDialog from '../components/TaskDetailDialog';
import ConfirmDialog from '../components/ConfirmDialog';
import GanttChart from '../components/GanttChart';
import UserPicker from '../components/UserPicker';
import { flattenTree, selectableParents, toGanttTasks } from '../utils/taskTree';
import {
  PRIORITY,
  PRIORITY_COLOR,
  PROJECT_MEMBER_ROLE,
  PROJECT_STATUS,
  STATUS,
  STATUS_COLOR,
  TASK_TYPE,
} from '../utils/constants';
import { formatDate, toLocalDateString } from '../utils/date';

/**
 * 프로젝트 상세.
 *   개요 탭 : 프로젝트 정보 수정/삭제 (ADMIN만)
 *   멤버 탭 : 멤버 추가·역할 변경·제거 (ADMIN만)
 *   WBS 탭  : 계층 구조 표, 상위 작업 변경
 *   간트 탭 : frappe-gantt 시각화
 */
export default function ProjectDetailPage() {
  const { id } = useParams();
  const projectId = Number(id);
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  const [tab, setTab] = useState(0);
  const [project, setProject] = useState(null);
  const [tree, setTree] = useState([]);
  const [members, setMembers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // 트리는 서버가 준 그대로 보관하고, 화면용 평탄화 배열은 파생값으로 계산한다.
  // useMemo를 쓰면 tree가 바뀔 때만 다시 계산한다 (렌더마다 재계산 방지).
  const flatTasks = useMemo(() => flattenTree(tree), [tree]);
  const ganttTasks = useMemo(() => toGanttTasks(flatTasks), [flatTasks]);

  const myMembership = members.find((m) => m.userId === user?.id);
  const isAdmin = myMembership?.role === 'ADMIN';

  const loadProject = useCallback(async () => {
    try {
      setProject(await projectApi.getProject(projectId));
    } catch (err) {
      toast.apiError(err);
      navigate('/projects', { replace: true });
    }
  }, [projectId, toast, navigate]);

  const loadTasks = useCallback(async () => {
    try {
      const data = await projectApi.getProjectTasks(projectId);
      setTree(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.apiError(err);
    }
  }, [projectId, toast]);

  const loadMembers = useCallback(async () => {
    try {
      const list = await projectApi.listMembers(projectId);
      setMembers(Array.isArray(list) ? list : []);
    } catch (err) {
      toast.apiError(err);
    }
  }, [projectId, toast]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadProject(), loadTasks(), loadMembers()]).finally(() => setLoading(false));
    listCategories().then(setCategories).catch(() => setCategories([]));
  }, [loadProject, loadTasks, loadMembers]);

  if (loading && !project) return <LinearProgress />;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <IconButton onClick={() => navigate('/projects')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>
          {project?.name}
        </Typography>
        {project && (
          <Chip size="small" label={PROJECT_STATUS[project.status] ?? project.status} />
        )}
      </Box>

      <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="개요" />
        <Tab label={`멤버 (${members.length})`} />
        <Tab label={`WBS (${flatTasks.length})`} />
        <Tab label="간트차트" />
      </Tabs>

      {tab === 0 && (
        <OverviewTab
          project={project}
          isAdmin={isAdmin}
          onSaved={loadProject}
          onDeleted={() => navigate('/projects')}
        />
      )}
      {tab === 1 && (
        <MemberTab
          projectId={projectId}
          members={members}
          isAdmin={isAdmin}
          onChanged={loadMembers}
        />
      )}
      {tab === 2 && (
        <WbsTab
          projectId={projectId}
          flatTasks={flatTasks}
          categories={categories}
          onChanged={loadTasks}
        />
      )}
      {tab === 3 && (
        <GanttTab ganttTasks={ganttTasks} onChanged={loadTasks} />
      )}
    </Box>
  );
}

// ── 개요 탭 ───────────────────────────────────────────────────
function OverviewTab({ project, isAdmin, onSaved, onDeleted }) {
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // project가 로드된 뒤에 폼 초기값을 채운다
  useEffect(() => {
    if (!project) return;
    setForm({
      name: project.name ?? '',
      description: project.description ?? '',
      startDate: project.startDate ?? '',
      endDate: project.endDate ?? '',
      status: project.status ?? 'PLANNED',
    });
  }, [project]);

  if (!form) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await projectApi.updateProject(project.id, {
        name: form.name.trim(),
        description: form.description || null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        status: form.status,
      });
      toast.success('저장했습니다.');
      onSaved();
    } catch (err) {
      toast.apiError(err);
    }
  };

  const handleDelete = async () => {
    try {
      await projectApi.deleteProject(project.id);
      toast.success('삭제했습니다.');
      onDeleted();
    } catch (err) {
      toast.apiError(err);
    }
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 2, maxWidth: 640 }}>
          <TextField
            label="이름"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            size="small"
            disabled={!isAdmin}
          />
          <TextField
            label="설명"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            multiline
            minRows={3}
            size="small"
            disabled={!isAdmin}
          />
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr 1fr' }}>
            <TextField
              label="시작일"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
              size="small"
              disabled={!isAdmin}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="종료일"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
              size="small"
              disabled={!isAdmin}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              select
              label="상태"
              value={form.status}
              onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
              size="small"
              disabled={!isAdmin}
            >
              {Object.entries(PROJECT_STATUS).map(([code, label]) => (
                <MenuItem key={code} value={code}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          {isAdmin ? (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button type="submit" variant="contained">
                저장
              </Button>
              <Button color="error" onClick={() => setConfirmDelete(true)}>
                프로젝트 삭제
              </Button>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              프로젝트 정보는 관리자(ADMIN)만 수정할 수 있습니다.
            </Typography>
          )}
        </Box>
      </CardContent>

      <ConfirmDialog
        open={confirmDelete}
        message="프로젝트를 삭제할까요? 소프트 삭제되어 목록에서 사라집니다."
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(false)}
      />
    </Card>
  );
}

// ── 멤버 탭 ───────────────────────────────────────────────────
function MemberTab({ projectId, members, isAdmin, onChanged }) {
  const toast = useToast();
  const [picked, setPicked] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);

  const handleAdd = async () => {
    if (!picked) return;
    try {
      await projectApi.addMember(projectId, picked.id, 'MEMBER');
      toast.success(`${picked.name} 님을 추가했습니다.`);
      setPicked(null);
      onChanged();
    } catch (err) {
      toast.apiError(err);
    }
  };

  const handleRoleChange = async (userId, role) => {
    try {
      await projectApi.changeMemberRole(projectId, userId, role);
      onChanged();
    } catch (err) {
      toast.apiError(err);
    }
  };

  const handleRemove = async () => {
    try {
      await projectApi.removeMember(projectId, removeTarget.userId);
      toast.success('제거했습니다.');
      onChanged();
    } catch (err) {
      toast.apiError(err);
    }
  };

  return (
    <Box>
      {isAdmin && (
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Box sx={{ flexGrow: 1, maxWidth: 420 }}>
              <UserPicker value={picked} onChange={setPicked} label="추가할 멤버 검색" />
            </Box>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd} disabled={!picked}>
              멤버 추가
            </Button>
          </CardContent>
        </Card>
      )}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>이름</TableCell>
              <TableCell width={160}>소속</TableCell>
              <TableCell width={180}>역할</TableCell>
              <TableCell width={60} />
            </TableRow>
          </TableHead>
          <TableBody>
            {members.map((m) => (
              <TableRow key={m.id} hover>
                {/* 서버가 JOIN해서 userName/departmentName까지 내려준다 (추가 조회 불필요) */}
                <TableCell>{m.userName ?? `#${m.userId}`}</TableCell>
                <TableCell>{m.departmentName ?? '-'}</TableCell>
                <TableCell>
                  {isAdmin ? (
                    <Select
                      size="small"
                      value={m.role}
                      onChange={(e) => handleRoleChange(m.userId, e.target.value)}
                      sx={{ minWidth: 120 }}
                    >
                      {Object.entries(PROJECT_MEMBER_ROLE).map(([code, label]) => (
                        <MenuItem key={code} value={code}>
                          {label}
                        </MenuItem>
                      ))}
                    </Select>
                  ) : (
                    <Chip size="small" label={PROJECT_MEMBER_ROLE[m.role] ?? m.role} />
                  )}
                </TableCell>
                <TableCell>
                  {isAdmin && (
                    <IconButton size="small" onClick={() => setRemoveTarget(m)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <ConfirmDialog
        open={removeTarget != null}
        message={`${removeTarget?.userName ?? `#${removeTarget?.userId}`} 님을 프로젝트에서 제거할까요?`}
        confirmText="제거"
        onConfirm={handleRemove}
        onClose={() => setRemoveTarget(null)}
      />
    </Box>
  );
}

// ── WBS 탭 ────────────────────────────────────────────────────
function WbsTab({ projectId, flatTasks, categories, onChanged }) {
  const toast = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [parentForNew, setParentForNew] = useState(null);

  /**
   * 상위 작업 변경. 서버가 순환(CIRCULAR_PARENT)을 막지만,
   * 드롭다운에서 자기 자손을 아예 못 고르게 selectableParents로 걸러둔다.
   */
  const handleParentChange = async (taskId, value) => {
    const parentTaskId = value === '' ? null : Number(value);
    try {
      await taskApi.setParent(taskId, parentTaskId);
      toast.success('상위 작업을 변경했습니다.');
      onChanged();
    } catch (err) {
      toast.apiError(err);
    }
  };

  const openCreate = (parentTaskId = null) => {
    setEditingTask(null);
    setParentForNew(parentTaskId);
    setFormOpen(true);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => openCreate(null)}>
          WBS 작업 추가
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>작업</TableCell>
              <TableCell width={100}>종류</TableCell>
              <TableCell width={90}>상태</TableCell>
              <TableCell width={90}>우선순위</TableCell>
              <TableCell width={200}>기간</TableCell>
              <TableCell width={80}>진행률</TableCell>
              <TableCell width={200}>상위 작업</TableCell>
              <TableCell width={60} />
            </TableRow>
          </TableHead>
          <TableBody>
            {flatTasks.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                  작업이 없습니다. WBS 작업을 추가해 보세요.
                </TableCell>
              </TableRow>
            )}

            {flatTasks.map((t) => (
              <TableRow key={t.id} hover>
                <TableCell
                  sx={{ pl: 2 + t.depth * 3, cursor: 'pointer' }}
                  onClick={() => setDetailId(t.id)}
                >
                  {/* depth만큼 들여쓰기 + 자식이 있으면 표시 */}
                  {t.depth > 0 && (
                    <Box component="span" sx={{ color: 'text.disabled', mr: 0.5 }}>
                      └
                    </Box>
                  )}
                  {t.title}
                </TableCell>
                <TableCell>{TASK_TYPE[t.taskType] ?? t.taskType}</TableCell>
                <TableCell>
                  <Chip size="small" color={STATUS_COLOR[t.status]} label={STATUS[t.status] ?? t.status} />
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    variant="outlined"
                    color={PRIORITY_COLOR[t.priority]}
                    label={PRIORITY[t.priority] ?? t.priority}
                  />
                </TableCell>
                <TableCell sx={{ fontSize: 12 }}>
                  {formatDate(t.startDate)} ~ {formatDate(t.endDate)}
                </TableCell>
                <TableCell>{t.progressRate ?? 0}%</TableCell>
                <TableCell>
                  <Select
                    size="small"
                    fullWidth
                    value={t.parentTaskId ?? ''}
                    onChange={(e) => handleParentChange(t.id, e.target.value)}
                    displayEmpty
                    sx={{ fontSize: 13 }}
                  >
                    <MenuItem value="">
                      <em>최상위</em>
                    </MenuItem>
                    {selectableParents(flatTasks, t.id).map((p) => (
                      <MenuItem key={p.id} value={p.id}>
                        {'  '.repeat(p.depth)}
                        {p.title}
                      </MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell>
                  <Tooltip title="하위 작업 추가">
                    <IconButton size="small" onClick={() => openCreate(t.id)}>
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TaskFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={onChanged}
        task={editingTask}
        categories={categories}
        defaultType="WBS_TASK"
        projectId={projectId}
        parentTaskId={parentForNew}
      />

      <TaskDetailDialog
        open={detailId != null}
        taskId={detailId}
        onClose={() => setDetailId(null)}
        onChanged={onChanged}
        onEdit={(task) => {
          setDetailId(null);
          setEditingTask(task);
          setParentForNew(null);
          setFormOpen(true);
        }}
      />
    </Box>
  );
}

// ── 간트 탭 ───────────────────────────────────────────────────
function GanttTab({ ganttTasks, onChanged }) {
  const toast = useToast();
  const [viewMode, setViewMode] = useState('Week');
  const [detailId, setDetailId] = useState(null);

  /**
   * 막대를 드래그해 기간이 바뀌었을 때.
   *
   * 주의: PUT /api/tasks/{id}는 "전체 교체"라서 title/visibility 등을 빼먹으면
   * 그 값들이 null로 덮인다(visibility는 NOT NULL이라 에러). 그래서 먼저 GET으로
   * 현재 값을 받아온 뒤 날짜만 바꿔서 되돌려 보낸다.
   */
  const handleDateChange = async (taskId, start, end) => {
    try {
      const current = await taskApi.getTask(taskId);
      await taskApi.updateTask(taskId, {
        title: current.title,
        description: current.description,
        startDate: `${toLocalDateString(start)}T00:00:00`,
        endDate: `${toLocalDateString(end)}T23:59:59`,
        allDay: current.allDay,
        visibility: current.visibility,
        priority: current.priority,
        categoryId: current.categoryId,
      });
      toast.success('기간을 변경했습니다.');
      onChanged();
    } catch (err) {
      toast.apiError(err);
      onChanged(); // 실패 시 서버 기준으로 다시 그린다
    }
  };

  const handleProgressChange = async (taskId, progress) => {
    try {
      await taskApi.changeProgress(taskId, Math.round(progress));
      onChanged();
    } catch (err) {
      toast.apiError(err);
      onChanged();
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          막대를 드래그하면 기간이, 오른쪽 끝 핸들을 끌면 진행률이 바뀝니다.
        </Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={viewMode}
          onChange={(_e, v) => v && setViewMode(v)}
        >
          <ToggleButton value="Day">일</ToggleButton>
          <ToggleButton value="Week">주</ToggleButton>
          <ToggleButton value="Month">월</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Paper sx={{ p: 2, overflowX: 'auto' }}>
        <GanttChart
          tasks={ganttTasks}
          viewMode={viewMode}
          onTaskClick={setDetailId}
          onDateChange={handleDateChange}
          onProgressChange={handleProgressChange}
        />
      </Paper>

      <Divider sx={{ my: 2 }} />
      <Typography variant="caption" color="text.secondary">
        시작일·종료일이 모두 비어 있는 작업은 간트차트에 표시되지 않습니다.
      </Typography>

      <TaskDetailDialog
        open={detailId != null}
        taskId={detailId}
        onClose={() => setDetailId(null)}
        onChanged={onChanged}
      />
    </Box>
  );
}
