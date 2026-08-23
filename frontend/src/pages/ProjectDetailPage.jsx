import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  LinearProgress,
  MenuItem,
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
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import FolderIcon from '@mui/icons-material/Folder';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PeopleIcon from '@mui/icons-material/People';
import AccountTreeIcon from '@mui/icons-material/AccountTree';

import * as projectApi from '../api/projects';
import * as taskApi from '../api/tasks';
import { listCategories } from '../api/categories';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import TaskFormDialog from '../components/TaskFormDialog';
import TaskDetailDialog from '../components/TaskDetailDialog';
import ConfirmDialog from '../components/ConfirmDialog';
import WbsGanttTable from '../components/WbsGanttTable';
import UserPicker from '../components/UserPicker';
import { flattenTree, selectableParents } from '../utils/taskTree';
import { PROJECT_MEMBER_ROLE, PROJECT_STATUS, PROJECT_STATUS_COLOR } from '../utils/constants';

const STATUS_ACCENT = {
  PLANNED: '#567C83',
  IN_PROGRESS: '#3AAEA9',
  ON_HOLD: '#f59e0b',
  DONE: '#A2D5AB',
};

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

  const flatTasks = useMemo(() => flattenTree(tree), [tree]);

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

  const accentColor = STATUS_ACCENT[project?.status] ?? '#567C83';

  return (
    <Box>
      {/* 페이지 헤더 */}
      <Box sx={{ mb: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <IconButton
            size="small"
            onClick={() => navigate('/projects')}
            sx={{ bgcolor: 'background.paper', border: '1px solid #e2e5ea', '&:hover': { bgcolor: '#f0f2f5' } }}
          >
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <Typography variant="caption" color="text.secondary">프로젝트 목록</Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ width: 44, height: 44, borderRadius: 2.5, bgcolor: `${accentColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FolderIcon sx={{ color: accentColor, fontSize: 24 }} />
          </Box>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="h5" noWrap>{project?.name}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
              {project && <Chip size="small" color={PROJECT_STATUS_COLOR[project.status]} label={PROJECT_STATUS[project.status] ?? project.status} />}
              {project?.progress != null && (
                <Typography variant="caption" color="text.secondary">진행률 <strong>{project.progress}%</strong></Typography>
              )}
            </Box>
          </Box>
          {project?.progress != null && (
            <Box sx={{ width: 160, display: { xs: 'none', sm: 'block' } }}>
              <LinearProgress
                variant="determinate"
                value={project.progress}
                sx={{ height: 6, borderRadius: 99, bgcolor: '#eef0f4', '& .MuiLinearProgress-bar': { borderRadius: 99, background: `linear-gradient(90deg, #567C83, #3AAEA9)` } }}
              />
            </Box>
          )}
        </Box>
      </Box>

      {/* 탭 */}
      <Box sx={{ bgcolor: 'background.paper', border: '1px solid #e2e5ea', borderRadius: 2.5, mb: 2, overflow: 'hidden' }}>
        <Tabs
          value={tab}
          onChange={(_e, v) => setTab(v)}
          TabIndicatorProps={{ sx: { display: 'none' } }}
          sx={{
            px: 1,
            '& .MuiTab-root': {
              fontSize: '0.84rem', minHeight: 44, py: 0,
              borderBottom: '2.5px solid transparent',
              transition: 'border-color 0.2s',
            },
            '& .MuiTab-root.Mui-selected': {
              borderBottom: '2.5px solid',
              borderColor: 'primary.main',
            },
          }}
        >
          <Tab icon={<InfoOutlinedIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="개요" />
          <Tab icon={<PeopleIcon sx={{ fontSize: 16 }} />} iconPosition="start" label={`멤버 (${members.length})`} />
          <Tab icon={<AccountTreeIcon sx={{ fontSize: 16 }} />} iconPosition="start" label={`WBS · 간트 (${flatTasks.length})`} />
        </Tabs>
      </Box>

      {tab === 0 && (
        <OverviewTab project={project} isAdmin={isAdmin} onSaved={loadProject} onDeleted={() => navigate('/projects')} />
      )}
      {tab === 1 && (
        <MemberTab projectId={projectId} members={members} isAdmin={isAdmin} onChanged={loadMembers} />
      )}
      {tab === 2 && (
        <WbsGanttTab
          project={project}
          projectId={projectId}
          flatTasks={flatTasks}
          categories={categories}
          isAdmin={isAdmin}
          onChanged={loadTasks}
        />
      )}
    </Box>
  );
}

function OverviewTab({ project, isAdmin, onSaved, onDeleted }) {
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
    <Card>
      <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #e2e5ea', bgcolor: '#f8f9fb', display: 'flex', alignItems: 'center', gap: 1 }}>
        <InfoOutlinedIcon sx={{ fontSize: 16, color: 'primary.light' }} />
        <Typography variant="subtitle1">프로젝트 정보</Typography>
        {!isAdmin && (
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>조회만 가능합니다 (관리자 전용)</Typography>
        )}
      </Box>
      <CardContent>
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 2, maxWidth: 640 }}>
          <TextField label="이름" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} size="small" disabled={!isAdmin} />
          <TextField label="설명" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} multiline minRows={3} size="small" disabled={!isAdmin} />
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr 1fr' }}>
            <TextField label="시작일" type="date" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} size="small" disabled={!isAdmin} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField label="종료일" type="date" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} size="small" disabled={!isAdmin} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField select label="상태" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} size="small" disabled={!isAdmin}>
              {Object.entries(PROJECT_STATUS).map(([code, label]) => (
                <MenuItem key={code} value={code}>{label}</MenuItem>
              ))}
            </TextField>
          </Box>

          {isAdmin && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button type="submit" variant="contained">저장</Button>
              <Button color="error" variant="outlined" onClick={() => setConfirmDelete(true)}>프로젝트 삭제</Button>
            </Box>
          )}
        </Box>
      </CardContent>

      <ConfirmDialog open={confirmDelete} message="프로젝트를 삭제할까요?" onConfirm={handleDelete} onClose={() => setConfirmDelete(false)} />
    </Card>
  );
}

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
        <Card sx={{ mb: 2 }}>
          <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #e2e5ea', bgcolor: '#f8f9fb', display: 'flex', alignItems: 'center', gap: 1 }}>
            <AddIcon sx={{ fontSize: 16, color: 'primary.light' }} />
            <Typography variant="subtitle2">멤버 추가</Typography>
          </Box>
          <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Box sx={{ flexGrow: 1, maxWidth: 420 }}>
              <UserPicker value={picked} onChange={setPicked} label="추가할 멤버 검색" />
            </Box>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd} disabled={!picked}>
              추가
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #e2e5ea', bgcolor: '#f8f9fb', display: 'flex', alignItems: 'center', gap: 1 }}>
          <PeopleIcon sx={{ fontSize: 16, color: 'primary.light' }} />
          <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>구성원</Typography>
          <Chip label={`${members.length}명`} size="small" sx={{ bgcolor: '#eef0f4', color: 'text.secondary', fontWeight: 700 }} />
        </Box>
        <TableContainer>
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
              {members.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 5, color: 'text.secondary' }}>구성원이 없습니다.</TableCell>
                </TableRow>
              )}
              {members.map((m) => (
                <TableRow key={m.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{m.userName ?? `#${m.userId}`}</TableCell>
                  <TableCell>{m.departmentName ?? '-'}</TableCell>
                  <TableCell>
                    {isAdmin ? (
                      <Select size="small" value={m.role} onChange={(e) => handleRoleChange(m.userId, e.target.value)} sx={{ minWidth: 120 }}>
                        {Object.entries(PROJECT_MEMBER_ROLE).map(([code, label]) => (
                          <MenuItem key={code} value={code}>{label}</MenuItem>
                        ))}
                      </Select>
                    ) : (
                      <Chip size="small" label={PROJECT_MEMBER_ROLE[m.role] ?? m.role} variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell>
                    {isAdmin && (
                      <IconButton size="small" onClick={() => setRemoveTarget(m)} color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

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

function WbsGanttTab({ project, projectId, flatTasks, categories, isAdmin, onChanged }) {
  const toast = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [parentForNew, setParentForNew] = useState(null);

  const openCreate = (parentTaskId = null) => {
    setEditingTask(null);
    setParentForNew(parentTaskId);
    setFormOpen(true);
  };

  const handleReorder = async (ids) => {
    try {
      await taskApi.reorderTasks(ids);
      onChanged();
    } catch (err) {
      toast.apiError(err);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>WBS · 간트 차트</Typography>
          <Typography variant="caption" color="text.secondary">작업 {flatTasks.length}개</Typography>
        </Box>
        {isAdmin && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => openCreate(null)}>
            단계 추가
          </Button>
        )}
      </Box>

      <Card sx={{ overflow: 'hidden' }}>
        <WbsGanttTable
          tasks={flatTasks}
          rangeStart={project?.startDate}
          rangeEnd={project?.endDate}
          onRowClick={setDetailId}
          onAddChild={openCreate}
          onReorder={handleReorder}
          canManage={isAdmin}
        />
      </Card>

      <TaskFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={onChanged}
        task={editingTask}
        categories={categories}
        defaultType="WBS_TASK"
        lockType
        projectId={projectId}
        parentTaskId={parentForNew}
        parentOptions={editingTask ? selectableParents(flatTasks, editingTask.id) : null}
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
