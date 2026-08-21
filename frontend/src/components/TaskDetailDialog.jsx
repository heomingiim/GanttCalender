import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  FormControlLabel,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Slider,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import LabelOutlinedIcon from '@mui/icons-material/LabelOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import TuneIcon from '@mui/icons-material/Tune';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import HistoryIcon from '@mui/icons-material/History';

import * as taskApi from '../api/tasks';
import { listCategories } from '../api/categories';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import UserPicker from './UserPicker';
import ConfirmDialog from './ConfirmDialog';
import {
  ACTIVITY_ACTION,
  PARTICIPANT_RESPONSE,
  PARTICIPANT_RESPONSE_COLOR,
  PRIORITY,
  PRIORITY_COLOR,
  STATUS,
  STATUS_BAR_COLOR,
  STATUS_COLOR,
  TASK_TYPE,
  VISIBILITY,
} from '../utils/constants';
import { formatDateTime } from '../utils/date';

const TYPE_COLOR = { TODO: '#90a4ae', EVENT: '#1976d2', WBS_TASK: '#7b1fa2' };
const TYPE_BG = { TODO: '#f0f4f5', EVENT: '#e8f0fc', WBS_TASK: '#f3e8fd' };

function InfoRow({ icon, label, children }) {
  return (
    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
      <Box sx={{ color: 'text.disabled', mt: 0.25, flexShrink: 0 }}>{icon}</Box>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>{label}</Typography>
        {children}
      </Box>
    </Box>
  );
}

export default function TaskDetailDialog({ open, taskId, onClose, onChanged, onEdit, allowDeleteWbs = true }) {
  const toast = useToast();
  const [tab, setTab] = useState('detail');
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [categories, setCategories] = useState([]);

  const load = useCallback(async () => {
    if (taskId == null) return;
    setLoading(true);
    try {
      setTask(await taskApi.getTask(taskId));
    } catch (err) {
      toast.apiError(err);
      setTask(null);
    } finally {
      setLoading(false);
    }
  }, [taskId, toast]);

  useEffect(() => {
    if (open) {
      setTab('detail');
      load();
      listCategories().then((list) => setCategories(Array.isArray(list) ? list : [])).catch(() => setCategories([]));
    }
  }, [open, load]);

  const category = categories.find((c) => c.id === task?.categoryId);

  const handleStatusChange = async (status) => {
    try {
      const updated = await taskApi.changeStatus(task.id, status);
      // 서버가 갱신된 task 전체를 반환한다 (DONE 시 progressRate=100 자동 동기화 포함).
      // 응답이 없거나 형태가 달라지면 로컬 상태만 업데이트해 다이얼로그 공백을 방지한다.
      setTask(updated?.id ? updated : { ...task, status });
      onChanged?.();
    } catch (err) {
      toast.apiError(err);
    }
  };

  const handleProgressCommit = async (_event, value) => {
    const before = task.progressRate;
    try {
      setTask(await taskApi.changeProgress(task.id, value));
      onChanged?.();
    } catch (err) {
      toast.apiError(err);
      setTask((prev) => (prev ? { ...prev, progressRate: before } : prev));
    }
  };

  const removingFromMyListOnly = !allowDeleteWbs && task?.taskType === 'WBS_TASK';

  const handleDelete = async () => {
    try {
      if (removingFromMyListOnly) {
        await taskApi.unassignSelf(task.id);
        toast.success('내 목록에서 제외했습니다.');
      } else {
        await taskApi.deleteTask(task.id);
        toast.success('삭제했습니다.');
      }
      onChanged?.();
      onClose();
    } catch (err) {
      toast.apiError(err);
    }
  };

  const typeColor = TYPE_COLOR[task?.taskType] ?? '#567C83';
  const typeBg = TYPE_BG[task?.taskType] ?? '#f8f9fb';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
      {/* 헤더 */}
      <Box sx={{ px: 3, pt: 2.5, pb: 2, borderBottom: '1px solid #e2e5ea', bgcolor: '#f8f9fb' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          <Box sx={{ width: 42, height: 42, borderRadius: 2, bgcolor: typeBg, border: `1.5px solid ${typeColor}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mt: 0.25 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: typeColor }} />
          </Box>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.3, mb: 0.75 }}>
              {task?.title ?? '작업 상세'}
            </Typography>
            {task && (
              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                <Chip size="small" label={TASK_TYPE[task.taskType] ?? task.taskType}
                  sx={{ bgcolor: typeBg, color: typeColor, borderColor: `${typeColor}44`, border: '1px solid', fontSize: '0.72rem', height: 22 }} />
                <Chip size="small" color={STATUS_COLOR[task.status]} label={STATUS[task.status] ?? task.status}
                  sx={{ fontSize: '0.72rem', height: 22 }} />
                <Chip size="small" variant="outlined" color={PRIORITY_COLOR[task.priority]} label={PRIORITY[task.priority] ?? task.priority}
                  sx={{ fontSize: '0.72rem', height: 22 }} />
              </Box>
            )}
          </Box>
          <IconButton size="small" onClick={onClose} sx={{ flexShrink: 0, mt: -0.5 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Tabs
          value={tab}
          onChange={(_e, v) => setTab(v)}
          TabIndicatorProps={{ sx: { display: 'none' } }}
          sx={{
            mt: 1.5,
            minHeight: 36,
            '& .MuiTab-root': {
              fontSize: '0.8rem', minHeight: 36, py: 0, px: 1.5,
              borderBottom: '2px solid transparent',
              transition: 'border-color 0.2s',
            },
            '& .MuiTab-root.Mui-selected': {
              borderBottom: '2px solid',
              borderColor: 'primary.main',
            },
          }}
        >
          <Tab icon={<TuneIcon sx={{ fontSize: 15 }} />} iconPosition="start" label="상세" value="detail" />
          {task?.taskType === 'WBS_TASK' && <Tab icon={<PeopleOutlineIcon sx={{ fontSize: 15 }} />} iconPosition="start" label="담당자" value="assignee" />}
          {task?.taskType !== 'TODO' && <Tab icon={<PeopleOutlineIcon sx={{ fontSize: 15 }} />} iconPosition="start" label="참석자" value="participant" />}
          <Tab icon={<HistoryIcon sx={{ fontSize: 15 }} />} iconPosition="start" label="이력" value="activity" />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 3, minHeight: 280 }}>
        {loading && <LinearProgress sx={{ mb: 2, borderRadius: 99 }} />}

        {tab === 'detail' && task && (
          <Box sx={{ display: 'grid', gap: 2.5 }}>
            <InfoRow icon={<AccessTimeIcon sx={{ fontSize: 18 }} />} label="기간">
              <Typography variant="body2">
                {formatDateTime(task.startDate)} ~ {formatDateTime(task.endDate)}
                {task.allDay ? <Chip label="종일" size="small" sx={{ ml: 1, height: 18, fontSize: '0.7rem' }} /> : ''}
              </Typography>
            </InfoRow>

            <InfoRow icon={<DescriptionOutlinedIcon sx={{ fontSize: 18 }} />} label="설명">
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: task.description ? 'text.primary' : 'text.disabled' }}>
                {task.description || '설명 없음'}
              </Typography>
            </InfoRow>

            <InfoRow icon={<LockOutlinedIcon sx={{ fontSize: 18 }} />} label="구분">
              <Typography variant="body2">{VISIBILITY[task.visibility] ?? task.visibility}</Typography>
            </InfoRow>

            <InfoRow icon={<LabelOutlinedIcon sx={{ fontSize: 18 }} />} label="카테고리">
              {category ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: category.color || 'grey.500', flexShrink: 0 }} />
                  <Typography variant="body2">{category.name}{category.team ? ' (팀 공용)' : ''}</Typography>
                </Box>
              ) : (
                <Typography variant="body2" color="text.disabled">미지정</Typography>
              )}
            </InfoRow>

            <Divider />

            {(task.canEditProgress ?? task.canEdit) ? (
              <Box sx={{ display: 'grid', gap: 2 }}>
                <TextField
                  select
                  size="small"
                  label="상태 변경"
                  value={task.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  helperText="완료로 바꾸면 진행률이 100%로, 대기로 바꾸면 0%로 함께 조정됩니다."
                >
                  {Object.entries(STATUS).map(([code, label]) => (
                    <MenuItem key={code} value={code}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: STATUS_BAR_COLOR[code] ?? '#ccc', flexShrink: 0 }} />
                        {label}
                      </Box>
                    </MenuItem>
                  ))}
                </TextField>

                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">진행률</Typography>
                    <Typography variant="caption" fontWeight={700} color="primary.main">{task.progressRate}%</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={task.progressRate ?? 0}
                    sx={{ height: 6, borderRadius: 99, bgcolor: '#eef0f4', mb: 1, '& .MuiLinearProgress-bar': { borderRadius: 99, background: 'linear-gradient(90deg, #567C83, #3AAEA9)' } }}
                  />
                  <Slider
                    value={task.progressRate ?? 0}
                    onChange={(_e, v) => setTask((prev) => ({ ...prev, progressRate: v }))}
                    onChangeCommitted={handleProgressCommit}
                    step={5}
                    marks
                    min={0}
                    max={100}
                    valueLabelDisplay="auto"
                    size="small"
                  />
                </Box>
              </Box>
            ) : (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">진행률</Typography>
                  <Typography variant="caption" fontWeight={700}>{task.progressRate}%</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={task.progressRate ?? 0}
                  sx={{ height: 6, borderRadius: 99, bgcolor: '#eef0f4', '& .MuiLinearProgress-bar': { borderRadius: 99, background: 'linear-gradient(90deg, #567C83, #3AAEA9)' } }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  작성자·담당자만 상태·진행률을 바꿀 수 있습니다.
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {tab === 'assignee' && <AssigneeTab taskId={taskId} canEdit={!!task?.canEdit} />}
        {tab === 'participant' && <ParticipantTab taskId={taskId} />}
        {tab === 'activity' && <ActivityTab taskId={taskId} />}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e2e5ea', bgcolor: '#f8f9fb' }}>
        {tab !== 'activity' && (
          <IconButton
            color="error"
            size="small"
            onClick={() => setConfirmDelete(true)}
            disabled={!task || (removingFromMyListOnly ? false : !task.canEdit)}
            sx={{ mr: 'auto', border: '1px solid', borderColor: 'error.light', '&:disabled': { borderColor: 'transparent' } }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        )}
        {tab !== 'activity' && (
          <Button
            startIcon={<EditIcon />}
            onClick={() => onEdit?.(task)}
            disabled={!task || !task.canEdit}
            variant="outlined"
            size="small"
          >
            수정
          </Button>
        )}
        <Button onClick={onClose} variant="contained" size="small" sx={{ ml: tab === 'activity' ? 'auto' : 0 }}>닫기</Button>
      </DialogActions>

      <ConfirmDialog
        open={confirmDelete}
        message={removingFromMyListOnly ? '내 목록에서만 뺄까요? 프로젝트의 WBS 작업 자체는 그대로 남습니다.' : '이 작업을 삭제할까요?'}
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(false)}
      />
    </Dialog>
  );
}

function AssigneeTab({ taskId, canEdit }) {
  const toast = useToast();
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (taskId == null) return;
    let cancelled = false;
    setLoading(true);
    taskApi.getAssignees(taskId)
      .then((list) => { if (cancelled) return; setSelected(Array.isArray(list) ? list : []); setLoadFailed(false); })
      .catch((err) => { if (cancelled) return; setLoadFailed(true); toast.apiError(err); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [taskId, toast]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await taskApi.replaceAssignees(taskId, selected.map((u) => u.id));
      toast.success('담당자를 저장했습니다.');
    } catch (err) {
      toast.apiError(err);
    } finally {
      setSaving(false);
    }
  };

  if (!canEdit) {
    return (
      <Box sx={{ display: 'grid', gap: 2 }}>
        <Typography variant="body2" color="text.secondary">담당자는 작성자·프로젝트 관리자만 변경할 수 있습니다.</Typography>
        {loading ? <LinearProgress /> : selected.length === 0 ? (
          <Typography color="text.disabled" variant="body2">담당자 없음</Typography>
        ) : (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {selected.map((u) => <Chip key={u.id} label={u.name} size="small" variant="outlined" />)}
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      {loadFailed ? (
        <Alert severity="error">현재 담당자를 불러오지 못했습니다. 이 상태로 저장하면 기존 담당자가 지워지므로 저장을 막았습니다. 잠시 후 다시 열어주세요.</Alert>
      ) : (
        <Alert severity="info" sx={{ fontSize: '0.8rem' }}>저장하면 <b>여기 있는 목록으로 전체 교체</b>됩니다. 빼고 싶은 사람은 목록에서 제거한 뒤 저장하세요.</Alert>
      )}
      {loading ? <LinearProgress /> : (
        <UserPicker multiple value={selected} onChange={setSelected} label="담당자 검색" disabled={loadFailed} />
      )}
      <Button variant="contained" onClick={handleSave} disabled={saving || loading || loadFailed} sx={{ justifySelf: 'start' }}>
        담당자 저장
      </Button>
    </Box>
  );
}

function ParticipantTab({ taskId }) {
  const toast = useToast();
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [required, setRequired] = useState(false);

  const load = useCallback(async () => {
    if (taskId == null) return;
    setListLoading(true);
    try {
      const res = await taskApi.getParticipants(taskId);
      setList(Array.isArray(res) ? res : []);
    } catch (err) {
      toast.apiError(err);
      setList([]);
    } finally {
      setListLoading(false);
    }
  }, [taskId, toast]);

  useEffect(() => { load(); }, [load]);

  const handleInvite = async () => {
    try {
      await taskApi.inviteParticipants(taskId, selected.map((u) => u.id), required);
      toast.success('초대했습니다.');
      setSelected([]);
      load();
    } catch (err) {
      toast.apiError(err);
    }
  };

  const handleRespond = async (status) => {
    try {
      await taskApi.respondToInvite(taskId, status);
      toast.success('응답을 저장했습니다.');
      load();
    } catch (err) {
      toast.apiError(err);
    }
  };

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <UserPicker multiple value={selected} onChange={setSelected} label="참석자 검색" />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <FormControlLabel
          control={<Switch checked={required} onChange={(e) => setRequired(e.target.checked)} size="small" />}
          label={<Typography variant="body2">필수 참석</Typography>}
        />
        {selected.length > 0 && (
          <Button variant="contained" size="small" onClick={handleInvite}>초대</Button>
        )}
      </Box>

      {!listLoading && (list.some((p) => p.userId === user?.id) ? (
        <Box sx={{ bgcolor: '#f8f9fb', border: '1px solid #e2e5ea', borderRadius: 2, p: 1.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>내 응답</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {['ACCEPTED', 'TENTATIVE', 'DECLINED'].map((s) => (
              <Button key={s} size="small" variant="outlined" onClick={() => handleRespond(s)} sx={{ fontSize: '0.78rem' }}>
                {PARTICIPANT_RESPONSE[s]}
              </Button>
            ))}
          </Box>
        </Box>
      ) : (
        <Typography variant="caption" color="text.secondary">이 일정의 참석자가 아니라 응답할 수 없습니다.</Typography>
      ))}

      {list.length > 0 && (
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>참석자 목록</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {list.map((p) => (
              <Box key={p.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.5, py: 1, bgcolor: '#f8f9fb', border: '1px solid #e2e5ea', borderRadius: 1.5 }}>
                <Box>
                  <Typography variant="body2" fontWeight={600}>사용자 #{p.userId}</Typography>
                  <Typography variant="caption" color="text.secondary">{p.required ? '필수 참석' : '선택 참석'}</Typography>
                </Box>
                <Chip size="small" color={PARTICIPANT_RESPONSE_COLOR[p.responseStatus]} label={PARTICIPANT_RESPONSE[p.responseStatus] ?? p.responseStatus} />
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}

function ActivityTab({ taskId }) {
  const toast = useToast();
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    if (taskId == null) return;
    setLogs([]);
    let cancelled = false;
    taskApi.getActivityLogs(taskId)
      .then((res) => { if (!cancelled) setLogs(Array.isArray(res) ? res : []); })
      .catch((err) => { if (cancelled) return; toast.apiError(err); });
    return () => { cancelled = true; };
  }, [taskId, toast]);

  if (logs.length === 0) {
    return <Typography variant="body2" color="text.secondary">기록된 활동이 없습니다.</Typography>;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      {logs.map((log) => (
        <Box key={log.id} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', px: 1.5, py: 1, bgcolor: '#f8f9fb', border: '1px solid #e2e5ea', borderRadius: 1.5 }}>
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.light', mt: 0.75, flexShrink: 0 }} />
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600}>{ACTIVITY_ACTION[log.action] ?? log.action}</Typography>
            <Typography variant="caption" color="text.secondary">사용자 #{log.userId} · {formatDateTime(log.createdAt)}</Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
}
