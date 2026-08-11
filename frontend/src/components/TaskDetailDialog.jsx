import { useCallback, useEffect, useState } from 'react';
import {
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
import { useToast } from '../contexts/ToastContext';
import NotReadyNotice from './NotReadyNotice';
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
 *  - 상세 탭   : STEP 6 (상태/진행률 변경, 삭제)
 *  - 담당자 탭 : STEP 12 (백엔드 미구현)
 *  - 참석자 탭 : STEP 13 (백엔드 미구현)
 *  - 이력 탭   : STEP 15 (백엔드 미구현)
 */
export default function TaskDetailDialog({ open, taskId, onClose, onChanged, onEdit }) {
  const toast = useToast();
  const [tab, setTab] = useState(0);
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
      setTab(0);
      load();
    }
  }, [open, load]);

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
    try {
      setTask(await taskApi.changeProgress(task.id, value));
      onChanged?.();
    } catch (err) {
      toast.apiError(err);
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
        <Tab label="상세" />
        <Tab label="담당자" />
        <Tab label="참석자" />
        <Tab label="이력" />
      </Tabs>
      <Divider />

      <DialogContent dividers sx={{ minHeight: 300 }}>
        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {tab === 0 && task && (
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
                공개 범위
              </Typography>
              <Typography variant="body2">
                {VISIBILITY[task.visibility] ?? task.visibility}
              </Typography>
            </Box>

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
          </Box>
        )}

        {tab === 1 && <AssigneeTab taskId={taskId} />}
        {tab === 2 && <ParticipantTab taskId={taskId} />}
        {tab === 3 && <ActivityTab taskId={taskId} />}
      </DialogContent>

      <DialogActions>
        <IconButton color="error" onClick={() => setConfirmDelete(true)} disabled={!task}>
          <DeleteIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1 }} />
        <Button startIcon={<EditIcon />} onClick={() => onEdit?.(task)} disabled={!task}>
          수정
        </Button>
        <Button onClick={onClose}>닫기</Button>
      </DialogActions>

      <ConfirmDialog
        open={confirmDelete}
        message="이 작업을 삭제할까요? (소프트 삭제되어 목록에서만 사라집니다)"
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(false)}
      />
    </Dialog>
  );
}

// ── STEP 12: 담당자 ───────────────────────────────────────────
function AssigneeTab({ taskId }) {
  const toast = useToast();
  const [selected, setSelected] = useState([]);
  const [notReady, setNotReady] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await taskApi.replaceAssignees(taskId, selected.map((u) => u.id));
      toast.success('담당자를 저장했습니다.');
    } catch (err) {
      if (err.notReady) setNotReady(true);
      else toast.apiError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        담당자를 저장하면 지정된 사람에게 알림이 발송됩니다.
      </Typography>
      <UserPicker multiple value={selected} onChange={setSelected} label="담당자 검색" />
      <Box>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          담당자 저장
        </Button>
      </Box>
      {notReady && (
        <NotReadyNotice step="STEP 12" api="PUT /api/tasks/{id}/assignees" />
      )}
    </Box>
  );
}

// ── STEP 13: 참석자 ───────────────────────────────────────────
function ParticipantTab({ taskId }) {
  const toast = useToast();
  const [list, setList] = useState([]);
  const [selected, setSelected] = useState([]);
  const [required, setRequired] = useState(false);
  const [notReady, setNotReady] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await taskApi.getParticipants(taskId);
      setList(Array.isArray(res) ? res : []);
      setNotReady(false);
    } catch (err) {
      if (err.notReady) setNotReady(true);
      setList([]);
    }
  }, [taskId]);

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
      if (err.notReady) setNotReady(true);
      else toast.apiError(err);
    }
  };

  const handleRespond = async (status) => {
    try {
      await taskApi.respondToInvite(taskId, status);
      toast.success('응답을 저장했습니다.');
      load();
    } catch (err) {
      if (err.notReady) setNotReady(true);
      else toast.apiError(err);
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

      {notReady && (
        <NotReadyNotice step="STEP 13" api="/api/tasks/{id}/participants" />
      )}
    </Box>
  );
}

// ── STEP 15: 활동 이력 ────────────────────────────────────────
function ActivityTab({ taskId }) {
  const [logs, setLogs] = useState([]);
  const [notReady, setNotReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    taskApi
      .getActivityLogs(taskId)
      .then((res) => {
        if (!cancelled) setLogs(Array.isArray(res) ? res : []);
      })
      .catch((err) => {
        if (!cancelled && err.notReady) setNotReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  if (notReady) {
    return <NotReadyNotice step="STEP 15" api="GET /api/tasks/{id}/activity-logs" />;
  }

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
