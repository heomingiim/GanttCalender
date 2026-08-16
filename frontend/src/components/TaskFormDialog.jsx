import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  TextField,
} from '@mui/material';

import * as taskApi from '../api/tasks';
import { useToast } from '../contexts/ToastContext';
import DateRangeField from './DateRangeField';
import {
  PRIORITY,
  STATUS,
  TASK_TYPE,
  VISIBILITY,
} from '../utils/constants';
import {
  fromDateTimeInputValue,
  toDateTimeInputValue,
} from '../utils/date';

// 폼의 빈 상태. 다이얼로그를 열 때마다 여기서 시작한다.
const EMPTY = {
  title: '',
  description: '',
  deliverable: '', // WBS 산출물. taskType === 'WBS_TASK'일 때만 화면에 노출
  taskType: 'EVENT',
  startDate: '',
  endDate: '',
  allDay: false,
  visibility: 'PUBLIC',
  status: 'TODO',
  priority: 'MEDIUM',
  categoryId: '',
  projectId: '', // ''(빈 값) = 개인 투두. projects prop이 있을 때만 화면에 노출
  parentTaskId: '', // 상위 작업. parentOptions prop이 있는 수정 화면에서만 노출
};

/**
 * 작업(일정/투두/WBS) 생성·수정 폼.
 *
 * ★ 제어 컴포넌트(controlled component) ★
 * 모든 <TextField>가 value={form.xxx} + onChange={...}로 묶여 있다.
 * 즉 화면에 보이는 글자의 출처는 DOM이 아니라 React state다.
 * 그래서 "저장 직전에 값 읽기" 같은 게 필요 없고, state만 보면 된다.
 */
export default function TaskFormDialog({
  open,
  onClose,
  onSaved,
  task = null,          // null이면 생성, 있으면 수정
  categories = [],
  defaultType = 'EVENT',
  defaultStart = null,  // 캘린더에서 날짜를 클릭해 열었을 때 채워짐
  defaultEnd = null,
  projectId = null,     // WBS 작업 생성 시: 고정된 프로젝트(선택 UI 없음)
  parentTaskId = null,
  lockType = false,     // 타입 선택 막기 (투두 페이지 등)
  projects = null,      // 있으면 "프로젝트" 선택 필드를 보여준다 (투두 페이지 등)
  parentOptions = null, // 있으면(수정 화면) "상위 작업" 선택 필드를 보여준다 (WBS만)
}) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const isEdit = task != null;

  // 다이얼로그가 열릴 때마다 폼을 초기화한다.
  // open을 의존성에 넣지 않으면 두 번째로 열었을 때 이전 값이 남는다.
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
        projectId: task.projectId ?? '',
        parentTaskId: task.parentTaskId ?? '',
      });
    } else {
      setForm({
        ...EMPTY,
        taskType: defaultType,
        startDate: toDateTimeInputValue(defaultStart),
        endDate: toDateTimeInputValue(defaultEnd),
        projectId: projectId ?? '',
      });
    }
  }, [open, task, defaultType, defaultStart, defaultEnd, projectId]);

  // 입력 필드 하나를 바꾸는 공통 핸들러.
  // ...prev 로 기존 값을 복사한 뒤 한 필드만 덮어쓴다(불변성 유지).
  // prev.xxx = v 처럼 직접 수정하면 React가 변경을 감지하지 못해 화면이 안 바뀐다.
  const setField = (name) => (event) => {
    const value =
      event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault(); // <form> 기본 동작(페이지 새로고침)을 막는다

    if (!form.title.trim()) {
      toast.error('제목을 입력하세요.');
      return;
    }
    // 서버도 INVALID_TASK_DATE로 막지만, 왕복 없이 먼저 걸러준다
    if (form.startDate && form.endDate && form.startDate > form.endDate) {
      toast.error('시작일은 종료일보다 앞이어야 합니다.');
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        // TaskUpdateRequest에는 status/taskType/parentTaskId가 없다.
        // 상태는 PATCH /status로 따로 바꾼다.
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
          if (nextParent !== prevParent) {
            await taskApi.setParent(task.id, nextParent);
          }
        }

        toast.success('수정했습니다.');
      } else {
        // projects prop이 있으면(투두 페이지) 사용자가 고른 값을, 없으면(WBS 작업 생성)
        // 고정으로 넘어온 projectId prop을 그대로 쓴다.
        const resolvedProjectId = projects
          ? (form.projectId === '' ? null : Number(form.projectId))
          : projectId;

        await taskApi.createTask({
          projectId: resolvedProjectId,
          parentTaskId,
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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      {/* form으로 감싸면 Enter 키 제출이 공짜로 따라온다 */}
      <Box component="form" onSubmit={handleSubmit}>
        <DialogTitle>{isEdit ? '작업 수정' : '새 작업'}</DialogTitle>

        <DialogContent dividers>
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
              disabled={isEdit || lockType} // 수정 시 타입 변경은 서버가 지원하지 않음
              helperText={isEdit ? '종류는 변경할 수 없습니다' : ' '}
            >
              {Object.entries(TASK_TYPE).map(([code, label]) => (
                <MenuItem key={code} value={code}>
                  {label}
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
                <MenuItem key={code} value={code}>
                  {label}
                </MenuItem>
              ))}
            </TextField>

            <DateRangeField
              startDate={form.startDate}
              endDate={form.endDate}
              allDay={form.allDay}
              onChange={(startDate, endDate) =>
                setForm((prev) => ({ ...prev, startDate, endDate }))
              }
            />

            <TextField
              select
              label="구분"
              value={form.visibility}
              onChange={setField('visibility')}
              size="small"
            >
              {Object.entries(VISIBILITY).map(([code, label]) => (
                <MenuItem key={code} value={code}>
                  {label}
                </MenuItem>
              ))}
            </TextField>

            {form.taskType === 'WBS_TASK' && (
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
                <MenuItem value="">
                  <em>최상위 (단계)</em>
                </MenuItem>
                {parentOptions.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {'　'.repeat(p.depth)}
                    {p.title}
                  </MenuItem>
                ))}
              </TextField>
            )}

            {projects && !isEdit && (
              <TextField
                select
                label="프로젝트"
                value={form.projectId}
                onChange={setField('projectId')}
                size="small"
                helperText="선택하면 프로젝트의 WBS·간트에도 나타납니다"
              >
                <MenuItem value="">개인 할 일 (프로젝트 없음)</MenuItem>
                {projects.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))}
              </TextField>
            )}

            <TextField
              select
              label="카테고리"
              value={form.categoryId}
              onChange={setField('categoryId')}
              size="small"
            >
              <MenuItem value="">지정 안 함</MenuItem>
              {categories.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                  {c.team ? ' (팀)' : ''}
                </MenuItem>
              ))}
            </TextField>

            {!isEdit && (
              <TextField
                select
                label="초기 상태"
                value={form.status}
                onChange={setField('status')}
                size="small"
              >
                {Object.entries(STATUS).map(([code, label]) => (
                  <MenuItem key={code} value={code}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            )}

            <FormControlLabel
              control={<Checkbox checked={form.allDay} onChange={setField('allDay')} />}
              label="종일"
              sx={{ alignSelf: 'center' }}
            />

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

        <DialogActions>
          <Button onClick={onClose}>취소</Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? '저장 중…' : '저장'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
