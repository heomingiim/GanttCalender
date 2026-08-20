import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  FormControlLabel,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import EditCalendarIcon from '@mui/icons-material/EditCalendar';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

import * as taskApi from '../api/tasks';
import { useToast } from '../contexts/ToastContext';
import DateRangeField from './DateRangeField';
import { PRIORITY, STATUS, TASK_TYPE, VISIBILITY } from '../utils/constants';
import { fromDateTimeInputValue, toDateTimeInputValue } from '../utils/date';

const EMPTY = {
  title: '',
  description: '',
  deliverable: '',
  taskType: 'EVENT',
  startDate: '',
  endDate: '',
  allDay: false,
  visibility: 'PUBLIC',
  status: 'TODO',
  priority: 'MEDIUM',
  categoryId: '',
  parentTaskId: '',
};

const TYPE_COLOR = { TODO: '#90a4ae', EVENT: '#1976d2', WBS_TASK: '#7b1fa2' };

export default function TaskFormDialog({
  open,
  onClose,
  onSaved,
  task = null,
  categories = [],
  defaultType = 'EVENT',
  defaultStart = null,
  defaultEnd = null,
  projectId = null,
  parentTaskId = null,
  lockType = false,
  parentOptions = null,
}) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const isEdit = task != null;
  const isTopLevelWbs = isEdit ? task.parentTaskId == null : parentTaskId == null;

  useEffect(() => {
    if (!open) return;
    if (task) {
      setForm({
        title: task.title ?? '',
        description: task.description ?? '',
        deliverable: task.deliverable ?? '',
        taskType: task.taskType ?? defaultType,
        startDate: toDateTimeInputValue(task.startDate),
        endDate: toDateTimeInputValue(task.endDate),
        allDay: Boolean(task.allDay),
        visibility: task.visibility ?? 'PUBLIC',
        status: task.status ?? 'TODO',
        priority: task.priority ?? 'MEDIUM',
        categoryId: task.categoryId ?? '',
        parentTaskId: task.parentTaskId ?? '',
      });
    } else {
      setForm({ ...EMPTY, taskType: defaultType, startDate: toDateTimeInputValue(defaultStart), endDate: toDateTimeInputValue(defaultEnd) });
    }
  }, [open, task, defaultType, defaultStart, defaultEnd]);

  const setField = (name) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) { toast.error('제목을 입력하세요.'); return; }
    if (!form.startDate || !form.endDate) { toast.error('시작일과 종료일을 입력하세요.'); return; }
    if (form.startDate && form.endDate && form.startDate > form.endDate) { toast.error('시작일은 종료일보다 앞이어야 합니다.'); return; }

    setSaving(true);
    try {
      if (isEdit) {
        await taskApi.updateTask(task.id, {
          title: form.title.trim(),
          description: form.description || null,
          deliverable: form.taskType === 'WBS_TASK' ? form.deliverable || null : null,
          startDate: fromDateTimeInputValue(form.startDate),
          endDate: fromDateTimeInputValue(form.endDate),
          allDay: form.allDay,
          visibility: form.visibility,
          priority: form.priority,
          categoryId: form.categoryId === '' ? null : Number(form.categoryId),
        });
        if (parentOptions) {
          const nextParent = form.parentTaskId === '' ? null : Number(form.parentTaskId);
          const prevParent = task.parentTaskId ?? null;
          if (nextParent !== prevParent) await taskApi.setParent(task.id, nextParent);
        }
        toast.success('수정했습니다.');
      } else {
        await taskApi.createTask({
          projectId, parentTaskId,
          categoryId: form.categoryId === '' ? null : Number(form.categoryId),
          taskType: form.taskType,
          title: form.title.trim(),
          description: form.description || null,
          deliverable: form.taskType === 'WBS_TASK' ? form.deliverable || null : null,
          startDate: fromDateTimeInputValue(form.startDate),
          endDate: fromDateTimeInputValue(form.endDate),
          allDay: form.allDay,
          visibility: form.visibility,
          status: form.status,
          priority: form.priority,
        });
        toast.success('등록했습니다.');
      }
      onSaved?.();
      onClose();
    } catch (err) {
      toast.apiError(err);
    } finally {
      setSaving(false);
    }
  };

  const typeColor = TYPE_COLOR[form.taskType] ?? '#567C83';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
      <Box component="form" onSubmit={handleSubmit}>
        {/* 다이얼로그 헤더 */}
        <Box sx={{ px: 3, py: 2.5, background: 'linear-gradient(135deg, #567C83 0%, #3AAEA9 100%)', display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {isEdit ? <EditCalendarIcon sx={{ color: '#fff', fontSize: 22 }} /> : <AddCircleOutlineIcon sx={{ color: '#fff', fontSize: 22 }} />}
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#fff', lineHeight: 1.2 }}>
              {isEdit ? '작업 수정' : '새 작업'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)' }}>
              {isEdit ? '작업 정보를 수정합니다' : '새로운 작업을 등록합니다'}
            </Typography>
          </Box>
        </Box>

        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
            <TextField
              label="제목"
              value={form.title}
              onChange={setField('title')}
              required
              autoFocus
              size="small"
              sx={{ gridColumn: '1 / -1' }}
            />

            <TextField
              select
              label="종류"
              value={form.taskType}
              onChange={setField('taskType')}
              size="small"
              disabled={isEdit || lockType}
              helperText={isEdit ? '종류는 변경할 수 없습니다' : ' '}
              slotProps={{
                select: {
                  renderValue: (v) => (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: TYPE_COLOR[v] ?? '#ccc', flexShrink: 0 }} />
                      {TASK_TYPE[v] ?? v}
                    </Box>
                  ),
                },
              }}
            >
              {Object.entries(TASK_TYPE).map(([code, label]) => (
                <MenuItem key={code} value={code}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: TYPE_COLOR[code] ?? '#ccc', flexShrink: 0 }} />
                    {label}
                  </Box>
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="우선순위"
              value={form.priority}
              onChange={setField('priority')}
              size="small"
              helperText=" "
            >
              {Object.entries(PRIORITY).map(([code, label]) => (
                <MenuItem key={code} value={code}>{label}</MenuItem>
              ))}
            </TextField>

            <DateRangeField
              startDate={form.startDate}
              endDate={form.endDate}
              allDay={form.allDay}
              onChange={(startDate, endDate) => setForm((prev) => ({ ...prev, startDate, endDate }))}
            />

            <FormControlLabel
              control={<Checkbox checked={form.allDay} onChange={setField('allDay')} size="small" />}
              label={<Typography variant="body2">종일</Typography>}
              sx={{ alignSelf: 'center' }}
            />

            {form.taskType !== 'WBS_TASK' && (
              <TextField select label="구분" value={form.visibility} onChange={setField('visibility')} size="small">
                {Object.entries(VISIBILITY).map(([code, label]) => (
                  <MenuItem key={code} value={code}>{label}</MenuItem>
                ))}
              </TextField>
            )}

            {form.taskType === 'WBS_TASK' && !isTopLevelWbs && (
              <TextField
                label="산출물"
                value={form.deliverable}
                onChange={setField('deliverable')}
                size="small"
                placeholder="예: 화면설계서, ERD"
                sx={{ gridColumn: '1 / -1' }}
              />
            )}

            {parentOptions && isEdit && task.taskType === 'WBS_TASK' && (
              <TextField
                select
                label="상위 작업"
                value={form.parentTaskId}
                onChange={setField('parentTaskId')}
                size="small"
                sx={{ gridColumn: '1 / -1' }}
              >
                <MenuItem value=""><em>최상위 (단계)</em></MenuItem>
                {parentOptions.map((p) => (
                  <MenuItem key={p.id} value={p.id}>{'　'.repeat(p.depth)}{p.title}</MenuItem>
                ))}
              </TextField>
            )}

            <TextField select label="카테고리" value={form.categoryId} onChange={setField('categoryId')} size="small">
              <MenuItem value="">지정 안 함</MenuItem>
              {categories.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: c.color || '#ccc', flexShrink: 0 }} />
                    {c.name}{c.team ? ' (팀)' : ''}
                  </Box>
                </MenuItem>
              ))}
            </TextField>

            {!isEdit && (
              <TextField select label="초기 상태" value={form.status} onChange={setField('status')} size="small">
                {Object.entries(STATUS).map(([code, label]) => (
                  <MenuItem key={code} value={code}>{label}</MenuItem>
                ))}
              </TextField>
            )}

            <TextField
              label="설명"
              value={form.description}
              onChange={setField('description')}
              multiline
              minRows={3}
              size="small"
              sx={{ gridColumn: '1 / -1' }}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e2e5ea', bgcolor: '#f8f9fb' }}>
          <Button onClick={onClose} sx={{ color: 'text.secondary' }}>취소</Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? '저장 중…' : '저장'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
