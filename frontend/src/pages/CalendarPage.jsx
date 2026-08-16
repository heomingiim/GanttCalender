import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import {
  Box,
  Button,
  Card,
  Checkbox,
  FormControl,
  InputAdornment,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Paper,
  Select,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';

import * as taskApi from '../api/tasks';
import { listCategories } from '../api/categories';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import TaskFormDialog from '../components/TaskFormDialog';
import TaskDetailDialog from '../components/TaskDetailDialog';
import { PRIORITY_HEX, TASK_TYPE } from '../utils/constants';
import { fromDateTimeInputValue } from '../utils/date';

/**
 * 캘린더.
 *
 * ★ 핵심 흐름 ★
 *   FullCalendar가 보여주는 기간이 바뀔 때마다 datesSet 콜백이 불린다.
 *   그 안의 info.start / info.end 를 그대로 서버 조회 범위(from/to)로 쓴다.
 *   즉 "달을 넘기면 자동으로 그 달 데이터를 다시 불러온다".
 *
 *   scope(MY/TEAM)나 검색어가 바뀌었을 때도 같은 범위로 다시 불러야 하므로,
 *   마지막 범위를 ref에 기억해 두고 refetch()에서 재사용한다.
 */
export default function CalendarPage() {
  const toast = useToast();
  const { user } = useAuth();

  // 서버가 준 원본 목록. FullCalendar용 변환은 typeFilter와 함께 useMemo로 파생시킨다
  // — 종류 체크박스를 눌렀다고 서버를 다시 부를 필요는 없다.
  const [rawTasks, setRawTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [scope, setScope] = useState('MY');
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [typeFilter, setTypeFilter] = useState(Object.keys(TASK_TYPE));
  // null = 아직 카테고리 목록을 못 받아서 필터링을 안 한다는 뜻(전부 통과).
  // 목록이 도착하면 "전체 선택" 상태로 채운다.
  const [categoryFilter, setCategoryFilter] = useState(null);

  // 다이얼로그 상태
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [defaultStart, setDefaultStart] = useState(null);
  const [defaultEnd, setDefaultEnd] = useState(null);
  const [detailId, setDetailId] = useState(null);

  // FullCalendar가 마지막으로 알려준 표시 범위
  const rangeRef = useRef({ start: null, end: null });

  const loadEvents = useCallback(
    async (start, end, currentScope, currentKeyword) => {
      if (!start || !end) return;
      try {
        const list = await taskApi.getCalendarEvents({
          from: start,
          to: end,
          scope: currentScope,
          keyword: currentKeyword,
        });
        setRawTasks(Array.isArray(list) ? list : []);
      } catch (err) {
        toast.apiError(err);
        setRawTasks([]);
      }
    },
    [toast]
  );

  // 표시 기간이 바뀔 때(달 이동, 뷰 전환) 호출된다
  const handleDatesSet = (info) => {
    rangeRef.current = { start: info.start, end: info.end };
    loadEvents(info.start, info.end, scope, keyword);
  };

  // 필터가 바뀌면 마지막 범위 그대로 다시 조회
  const refetch = useCallback(
    (nextScope = scope, nextKeyword = keyword) => {
      const { start, end } = rangeRef.current;
      loadEvents(start, end, nextScope, nextKeyword);
    },
    [loadEvents, scope, keyword]
  );

  const handleScopeChange = (_e, next) => {
    if (!next) return; // 같은 버튼을 다시 누르면 null이 온다 — 무시
    if (next === 'TEAM' && !user?.departmentId) {
      toast.error('소속 부서가 없어 팀 일정을 조회할 수 없습니다.');
      return;
    }
    setScope(next);
    refetch(next, keyword);
  };

  const handleSearch = (event) => {
    event.preventDefault();
    setKeyword(searchInput);
    refetch(scope, searchInput);
  };

  const handleTypeFilterChange = (_e, next) => {
    setTypeFilter(next); // 전부 해제해도 그대로 둔다 (아무것도 안 보이는 것도 유효한 선택)
  };

  const handleCategoryFilterChange = (event) => {
    setCategoryFilter(event.target.value);
  };

  // 서버 Task → FullCalendar event 객체 변환 + 종류/카테고리 필터.
  // 필터만 바꿀 때는 서버를 다시 부르지 않는다.
  const events = useMemo(
    () =>
      rawTasks
        .filter((t) => typeFilter.includes(t.taskType))
        .filter((t) => categoryFilter === null || categoryFilter.includes(t.categoryId ?? 'NONE'))
        .map((t) => {
          const category = categories.find((c) => c.id === t.categoryId);
          return {
            id: String(t.id),
            title: t.title,
            start: t.startDate,
            end: exclusiveEnd(t),
            allDay: Boolean(t.allDay),
            // 카테고리를 지정했으면 그 색을, 아니면 우선순위 색을 쓴다.
            backgroundColor: category?.color || PRIORITY_HEX[t.priority] || PRIORITY_HEX.MEDIUM,
            borderColor: 'transparent',
            extendedProps: { raw: t },
          };
        }),
    [rawTasks, typeFilter, categoryFilter, categories]
  );

  // 빈 날짜 칸 클릭 → 그 날짜로 새 일정 폼 열기
  const handleDateClick = (info) => {
    setEditingTask(null);
    setDefaultStart(info.date);
    // 09:00~10:00 기본값
    const end = new Date(info.date);
    end.setHours(end.getHours() + 1);
    setDefaultEnd(end);
    setFormOpen(true);
  };

  // 일정 막대 클릭 → 상세
  const handleEventClick = (info) => {
    setDetailId(Number(info.event.id));
  };

  // 드래그로 일정 이동 / 리사이즈
  const handleEventDrop = async (info) => {
    const raw = info.event.extendedProps.raw;
    try {
      await taskApi.updateTask(raw.id, {
        title: raw.title,
        description: raw.description,
        startDate: fromDateTimeInputValue(toInputLocal(info.event.start)),
        endDate: fromDateTimeInputValue(toInputLocal(inclusiveEnd(info.event))),
        allDay: info.event.allDay,
        visibility: raw.visibility,
        priority: raw.priority,
        categoryId: raw.categoryId,
      });
      toast.success('일정을 옮겼습니다.');
      refetch();
    } catch (err) {
      toast.apiError(err);
      info.revert(); // 실패하면 원래 위치로 되돌린다
    }
  };

  const openCreate = () => {
    setEditingTask(null);
    setDefaultStart(new Date());
    setDefaultEnd(null);
    setFormOpen(true);
  };

  // 카테고리는 작업 폼의 드롭다운에서만 쓰므로 마운트 시 1회만 로드한다.
  // (부수 효과는 useMemo가 아니라 useEffect에 넣어야 한다)
  useEffect(() => {
    listCategories()
      .then((list) => {
        const arr = Array.isArray(list) ? list : [];
        setCategories(arr);
        setCategoryFilter([...arr.map((c) => c.id), 'NONE']); // 처음엔 전체 선택
      })
      .catch(() => setCategories([]));
  }, []);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>
          캘린더
        </Typography>

        <ToggleButtonGroup value={scope} exclusive size="small" onChange={handleScopeChange}>
          <ToggleButton value="MY">내 일정</ToggleButton>
          <ToggleButton value="TEAM">팀 일정</ToggleButton>
        </ToggleButtonGroup>

        <ToggleButtonGroup value={typeFilter} size="small" onChange={handleTypeFilterChange}>
          {Object.entries(TASK_TYPE).map(([code, label]) => (
            <ToggleButton key={code} value={code}>
              {label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        {/*
          카테고리는 사용자가 계속 만들 수 있는 값이라 개수가 늘어난다.
          종류 필터처럼 버튼을 나열하면 카테고리가 많아질 때 줄이 끝없이 길어지므로,
          하나로 접히는 멀티 셀렉트 드롭다운을 쓴다.
        */}
        {categories.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel id="category-filter-label">카테고리</InputLabel>
            <Select
              labelId="category-filter-label"
              multiple
              value={categoryFilter ?? []}
              onChange={handleCategoryFilterChange}
              input={<OutlinedInput label="카테고리" />}
              renderValue={(selected) =>
                selected.length === categories.length + 1
                  ? '전체'
                  : `${selected.length}개 선택`
              }
            >
              {categories.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  <Checkbox size="small" checked={(categoryFilter ?? []).includes(c.id)} />
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: c.color || 'grey.500',
                      mr: 1,
                      flexShrink: 0,
                    }}
                  />
                  <ListItemText primary={c.name} />
                </MenuItem>
              ))}
              <MenuItem value="NONE">
                <Checkbox size="small" checked={(categoryFilter ?? []).includes('NONE')} />
                <ListItemText primary="미지정" />
              </MenuItem>
            </Select>
          </FormControl>
        )}

        <Box component="form" onSubmit={handleSearch}>
          <TextField
            size="small"
            placeholder="제목·설명 검색"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
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

        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          일정 등록
        </Button>
      </Box>

      <Card>
        <Paper sx={{ p: 2 }} elevation={0}>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale="ko"
            height="auto"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay',
            }}
            buttonText={{ today: '오늘', month: '월', week: '주', day: '일' }}
            events={events}
            datesSet={handleDatesSet}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            editable
            eventDrop={handleEventDrop}
            eventResize={handleEventDrop}
            dayMaxEvents={3}
            moreLinkText={(n) => `+${n}개 더보기`}
          />
        </Paper>
      </Card>

      <TaskFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => refetch()}
        task={editingTask}
        categories={categories}
        defaultType="EVENT"
        lockType
        defaultStart={defaultStart}
        defaultEnd={defaultEnd}
      />

      <TaskDetailDialog
        open={detailId != null}
        taskId={detailId}
        onClose={() => setDetailId(null)}
        onChanged={() => refetch()}
        onEdit={(task) => {
          setDetailId(null);
          setEditingTask(task);
          setFormOpen(true);
        }}
      />
    </Box>
  );
}

/**
 * ★ 아래 두 함수는 반드시 짝으로 쓴다 ★
 *
 * 서버는 종료일을 inclusive로 저장한다(8/12~8/14 = 3일짜리).
 * 그런데 FullCalendar의 종일 이벤트 end는 exclusive다(8/15가 3일짜리).
 *
 * 그래서 그릴 때 하루를 더하고(exclusiveEnd), 저장할 때 하루를 뺀다(inclusiveEnd).
 * 한쪽만 하면 드래그할 때마다 막대가 하루씩 밀린다.
 * 시간 지정 일정은 양쪽 다 inclusive라 건드리지 않는다.
 */
function exclusiveEnd(task) {
  if (!task.endDate || !task.allDay) return task.endDate;

  const end = new Date(task.endDate);
  end.setDate(end.getDate() + 1);
  return end;
}

/** exclusiveEnd의 역변환. 자세한 설명은 위 주석 참고 */
function inclusiveEnd(event) {
  if (!event.end) return event.start;
  if (!event.allDay) return event.end;

  const end = new Date(event.end);
  end.setDate(end.getDate() - 1);
  // 하루를 뺐더니 시작보다 앞서면 시작일로 맞춘다 (하루짜리 방어)
  return end < event.start ? event.start : end;
}

// Date → 'YYYY-MM-DDTHH:mm' (datetime-local 형식). 위 fromDateTimeInputValue와 짝
function toInputLocal(date) {
  if (!date) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}
