import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  STATUS_COLOR,
  TASK_TYPE,
  VISIBILITY,
} from '../utils/constants';
import { formatDateTime } from '../utils/date';

/**
 * 작업 상세 다이얼로그.
 *  - 상세 탭   : 상태/진행률 변경, 삭제
 *  - 담당자 탭 : 담당자 교체
 *  - 참석자 탭 : 초대 / 참석 응답
 *  - 이력 탭   : 활동 이력
 */
export default function TaskDetailDialog({ open, taskId, onClose, onChanged, onEdit }) {
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
      listCategories()
        .then((list) => setCategories(Array.isArray(list) ? list : []))
        .catch(() => setCategories([]));
    }
  }, [open, load]);

  const category = categories.find((c) => c.id === task?.categoryId);

  const handleStatusChange = async (status) => {
    try {
      // 서버가 갱신된 작업을 돌려주므로 그걸로 교체한다.
      // (DONE이면 진행률이 100으로 자동 동기화되는데, 그 결과가 응답에 담겨 온다)
      setTask(await taskApi.changeStatus(task.id, status));
      onChanged?.();
    } catch (err) {
      toast.apiError(err);
    }
  };

  const handleProgressCommit = async (_event, value) => {
    // onChange가 드래그 중에 이미 progressRate를 낙관적으로 바꿔놨다.
    // 서버 호출이 실패하면(예: 볼 권한만 있고 편집 권한은 없는 프로젝트 멤버)
    // 되돌리지 않으면 슬라이더가 저장 안 된 값을 계속 보여준다.
    const before = task.progressRate;
    try {
      setTask(await taskApi.changeProgress(task.id, value));
      onChanged?.();
    } catch (err) {
      toast.apiError(err);
      setTask((prev) => (prev ? { ...prev, progressRate: before } : prev));
    }
  };

  const handleDelete = async () => {
    try {
      await taskApi.deleteTask(task.id);
      toast.success('삭제했습니다.');
      onChanged?.();
      onClose();
    } catch (err) {
      toast.apiError(err);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        {task?.title ?? '작업 상세'}
        {task && (
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <Chip size="small" label={TASK_TYPE[task.taskType] ?? task.taskType} />
            <Chip
              size="small"
              color={STATUS_COLOR[task.status]}
              label={STATUS[task.status] ?? task.status}
            />
            <Chip
              size="small"
              variant="outlined"
              color={PRIORITY_COLOR[task.priority]}
              label={PRIORITY[task.priority] ?? task.priority}
            />
          </Box>
        )}
      </DialogTitle>

      <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ px: 2 }} variant="scrollable">
        <Tab label="상세" value="detail" />
        {task?.taskType === 'WBS_TASK' && <Tab label="담당자" value="assignee" />}
        {task?.taskType !== 'TODO' && <Tab label="참석자" value="participant" />}
        <Tab label="이력" value="activity" />
      </Tabs>
      <Divider />

      <DialogContent dividers sx={{ minHeight: 300 }}>
        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {tab === 'detail' && task && (
          <Box sx={{ display: 'grid', gap: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                기간
              </Typography>
              <Typography variant="body2">
                {formatDateTime(task.startDate)} ~ {formatDateTime(task.endDate)}
                {task.allDay ? ' (종일)' : ''}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">
                설명
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {task.description || '-'}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">
                구분
              </Typography>
              <Typography variant="body2">
                {VISIBILITY[task.visibility] ?? task.visibility}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">
                카테고리
              </Typography>
              {category ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.25 }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      bgcolor: category.color || 'grey.500',
                      flexShrink: 0,
                    }}
                  />
                  <Typography variant="body2">
                    {category.name}
                    {category.team ? ' (팀 공용)' : ''}
                  </Typography>
                </Box>
              ) : (
                <Typography variant="body2">-</Typography>
              )}
            </Box>

            {(task.canEditProgress ?? task.canEdit) ? (
              <>
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
                      {label}
                    </MenuItem>
                  ))}
                </TextField>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    진행률 — {task.progressRate}%
                  </Typography>
                  {/* onChange는 드래그 중 계속 발생하므로 상태만 바꾸고,
                      실제 API 호출은 손을 뗐을 때(onChangeCommitted) 한 번만 한다 */}
                  <Slider
                    value={task.progressRate ?? 0}
                    onChange={(_e, v) => setTask((prev) => ({ ...prev, progressRate: v }))}
                    onChangeCommitted={handleProgressCommit}
                    step={5}
                    marks
                    min={0}
                    max={100}
                    valueLabelDisplay="auto"
                  />
                </Box>
              </>
            ) : (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  진행률
                </Typography>
                <Typography variant="body2">
                  {STATUS[task.status] ?? task.status} · {task.progressRate}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
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

      <DialogActions>
        <IconButton
          color="error"
          onClick={() => setConfirmDelete(true)}
          disabled={!task || !task.canEdit}
        >
          <DeleteIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          startIcon={<EditIcon />}
          onClick={() => onEdit?.(task)}
          disabled={!task || !task.canEdit}
        >
          수정
        </Button>
        <Button onClick={onClose}>닫기</Button>
      </DialogActions>

      <ConfirmDialog
        open={confirmDelete}
        message="이 작업을 삭제할까요?"
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(false)}
      />
    </Dialog>
  );
}

// ── 담당자 ───────────────────────────────────────────
function AssigneeTab({ taskId, canEdit }) {
  const toast = useToast();
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  // 조회에 실패하면 "담당자 없음"과 구분이 안 된다. 그 상태로 저장하면
  // 전체 교체라 기존 담당자가 날아가므로 저장 자체를 막는다.
  const [loadFailed, setLoadFailed] = useState(false);

  // PUT /assignees는 전체 교체다. 현재 담당자를 먼저 채워두지 않으면
  // 한 명을 추가하려던 저장이 기존 담당자를 전부 지우는 결과가 된다.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    taskApi
      .getAssignees(taskId)
      .then((list) => {
        if (cancelled) return;
        setSelected(Array.isArray(list) ? list : []);
        setLoadFailed(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadFailed(true);
        toast.apiError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
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
        <Typography variant="body2" color="text.secondary">
          담당자는 작성자·프로젝트 관리자만 변경할 수 있습니다.
        </Typography>
        {loading ? (
          <LinearProgress />
        ) : selected.length === 0 ? (
          <Typography color="text.secondary">담당자 없음</Typography>
        ) : (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {selected.map((u) => (
              <Typography key={u.id} variant="body2">· {u.name}</Typography>
            ))}
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        담당자를 저장하면 지정된 사람에게 알림이 발송됩니다.
      </Typography>
      {loadFailed ? (
        <Alert severity="error">
          현재 담당자를 불러오지 못했습니다. 이 상태로 저장하면 기존 담당자가 지워지므로
          저장을 막았습니다. 잠시 후 다시 열어주세요.
        </Alert>
      ) : (
        <Alert severity="info">
          저장하면 <b>여기 있는 목록으로 전체 교체</b>됩니다. 빼고 싶은 사람은 목록에서
          제거한 뒤 저장하세요.
        </Alert>
      )}
      {loading ? (
        <LinearProgress />
      ) : (
        <UserPicker
          multiple
          value={selected}
          onChange={setSelected}
          label="담당자 검색"
          disabled={loadFailed}
        />
      )}
      <Box>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || loading || loadFailed}
        >
          담당자 저장
        </Button>
      </Box>
    </Box>
  );
}

// ── 참석자 ───────────────────────────────────────────
function ParticipantTab({ taskId }) {
  const toast = useToast();
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [selected, setSelected] = useState([]);
  const [required, setRequired] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await taskApi.getParticipants(taskId);
      setList(Array.isArray(res) ? res : []);
    } catch (err) {
      toast.apiError(err);
      setList([]);
    }
  }, [taskId, toast]);

  useEffect(() => {
    load();
  }, [load]);

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
          control={<Switch checked={required} onChange={(e) => setRequired(e.target.checked)} />}
          label="필수 참석"
        />
        <Button variant="contained" onClick={handleInvite} disabled={selected.length === 0}>
          초대
        </Button>
      </Box>

      <Divider />
      {/*
        참석자 본인만 응답할 수 있다. 서버가 비참석자에게 403(NOT_PARTICIPANT)을 주므로,
        버튼을 모두에게 보여주면 자기를 참석자로 안 넣은 작성자가 누를 때마다 에러가 뜬다.
      */}
      {list.some((p) => p.userId === user?.id) ? (
        <Box>
          <Typography variant="caption" color="text.secondary">
            내 응답
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
            {['ACCEPTED', 'TENTATIVE', 'DECLINED'].map((s) => (
              <Button key={s} size="small" variant="outlined" onClick={() => handleRespond(s)}>
                {PARTICIPANT_RESPONSE[s]}
              </Button>
            ))}
          </Box>
        </Box>
      ) : (
        <Typography variant="caption" color="text.secondary">
          이 일정의 참석자가 아니라 응답할 수 없습니다.
        </Typography>
      )}

      {list.length > 0 && (
        <List dense>
          {list.map((p) => (
            <ListItem
              key={p.id}
              secondaryAction={
                <Chip
                  size="small"
                  color={PARTICIPANT_RESPONSE_COLOR[p.responseStatus]}
                  label={PARTICIPANT_RESPONSE[p.responseStatus] ?? p.responseStatus}
                />
              }
            >
              <ListItemText
                primary={`사용자 #${p.userId}`}
                secondary={p.required ? '필수 참석' : '선택 참석'}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}

// ── 활동 이력 ────────────────────────────────────────
function ActivityTab({ taskId }) {
  const toast = useToast();
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    let cancelled = false;
    taskApi
      .getActivityLogs(taskId)
      .then((res) => {
        if (!cancelled) setLogs(Array.isArray(res) ? res : []);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.apiError(err);
      });
    return () => {
      cancelled = true;
    };
  }, [taskId, toast]);

  if (logs.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        기록된 활동이 없습니다.
      </Typography>
    );
  }

  return (
    <List dense>
      {logs.map((log) => (
        <ListItem key={log.id} divider>
          <ListItemText
            primary={`${ACTIVITY_ACTION[log.action] ?? log.action} · 사용자 #${log.userId}`}
            secondary={formatDateTime(log.createdAt)}
          />
        </ListItem>
      ))}
    </List>
  );
}
