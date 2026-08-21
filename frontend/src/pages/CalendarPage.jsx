import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import {
  Box,
  Button,
  Card,
  Checkbox,
  Divider,
  FormControlLabel,
  FormGroup,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import FilterListIcon from '@mui/icons-material/FilterList';

import * as taskApi from '../api/tasks';
import { listCategories } from '../api/categories';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import TaskFormDialog from '../components/TaskFormDialog';
import TaskDetailDialog from '../components/TaskDetailDialog';
import { TASK_TYPE } from '../utils/constants';
import { fromDateTimeInputValue, toDateTimeInputValue } from '../utils/date';
import { segmentedToggleSx, pillSearchSx } from '../utils/uiStyles';

const TYPE_DOT_COLOR = { TODO: '#90a4ae', EVENT: '#1976d2', WBS_TASK: '#7b1fa2' };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date) => startOfWeek(date, { weekStartsOn: 0 }),
  getDay,
  locales: { ko },
});

const DnDCalendar = withDragAndDrop(BigCalendar);

const RBC_VIEW_MAP = { month: 'month', week: 'week', day: 'day', list: 'agenda' };

const VIEW_OPTIONS = [
  { value: 'month', label: '월간' },
  { value: 'week', label: '주간' },
  { value: 'day', label: '일간' },
  { value: 'list', label: '목록' },
];

const MESSAGES = {
  allDay: '종일',
  previous: '이전',
  next: '다음',
  today: '오늘',
  month: '월간',
  week: '주간',
  day: '일간',
  agenda: '목록',
  date: '날짜',
  time: '시간',
  event: '일정',
  noEventsInRange: '이 기간에 일정이 없습니다.',
  showMore: (n) => `+${n}개 더보기`,
};

const FORMATS = {
  monthHeaderFormat: (date, culture, loc) => loc.format(date, 'yyyy년 M월', culture),
  weekdayFormat: (date, culture, loc) => loc.format(date, 'EEEEEE', culture),
  dateFormat: (date, culture, loc) => loc.format(date, 'd', culture),
  dayFormat: (date, culture, loc) => loc.format(date, 'M/d (EEEEEE)', culture),
  dayHeaderFormat: (date, culture, loc) => loc.format(date, 'yyyy년 M월 d일', culture),
  dayRangeHeaderFormat: ({ start, end }, culture, loc) =>
    `${loc.format(start, 'yyyy년 M월 d일', culture)} – ${loc.format(end, 'M월 d일', culture)}`,
  agendaHeaderFormat: ({ start, end }, culture, loc) =>
    `${loc.format(start, 'M월 d일', culture)} – ${loc.format(end, 'M월 d일', culture)}`,
  agendaDateFormat: (date, culture, loc) => loc.format(date, 'M/d (EEEEEE)', culture),
  agendaTimeFormat: (date, culture, loc) => loc.format(date, 'HH:mm', culture),
  agendaTimeRangeFormat: ({ start, end }, culture, loc) =>
    `${loc.format(start, 'HH:mm', culture)} – ${loc.format(end, 'HH:mm', culture)}`,
  timeGutterFormat: (date, culture, loc) => loc.format(date, 'HH:mm', culture),
};

function getTitle(date, view) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  if (view === 'month') return `${y}년 ${m}월`;
  if (view === 'day') return `${y}년 ${m}월 ${date.getDate()}일`;
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const sm = start.getMonth() + 1, sd = start.getDate();
  const em = end.getMonth() + 1, ed = end.getDate(), ey = end.getFullYear();
  if (start.getFullYear() !== ey) return `${y}.${sm}.${sd} – ${ey}.${em}.${ed}`;
  if (sm !== em) return `${y}년 ${sm}월 ${sd}일 – ${em}월 ${ed}일`;
  return `${y}년 ${sm}월 ${sd}일 – ${ed}일`;
}

function getVisibleRange(date, view) {
  const d = new Date(date);
  if (view === 'month') {
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    start.setDate(start.getDate() - start.getDay());
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    end.setDate(end.getDate() + (6 - end.getDay()) + 1);
    return { start, end };
  }
  if (view === 'week' || view === 'list') {
    const start = new Date(d);
    start.setDate(d.getDate() - d.getDay());
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return { start, end };
  }
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  return { start, end };
}

export default function CalendarPage() {
  const toast = useToast();
  const { user } = useAuth();

  const [rawTasks, setRawTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [scope, setScope] = useState('MY');
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [typeFilter, setTypeFilter] = useState(Object.keys(TASK_TYPE));
  const [categoryFilter, setCategoryFilter] = useState(null);

  const [viewType, setViewType] = useState('month');
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [defaultStart, setDefaultStart] = useState(null);
  const [defaultEnd, setDefaultEnd] = useState(null);
  const [detailId, setDetailId] = useState(null);

  const searchNavRef = useRef({ keyword: '', matches: [], index: -1 });
  const visibleRangeRef = useRef(null);

  const title = useMemo(() => getTitle(currentDate, viewType), [currentDate, viewType]);
  const visibleRange = useMemo(() => getVisibleRange(currentDate, viewType), [currentDate, viewType]);

  useEffect(() => { visibleRangeRef.current = visibleRange; }, [visibleRange]);

  const loadEvents = useCallback(
    async (start, end, currentScope, currentKeyword) => {
      if (!start || !end) return;
      try {
        const list = await taskApi.getCalendarEvents({ from: start, to: end, scope: currentScope, keyword: currentKeyword });
        setRawTasks(Array.isArray(list) ? list : []);
      } catch (err) {
        toast.apiError(err);
        setRawTasks([]);
      }
    },
    [toast],
  );

  useEffect(() => {
    loadEvents(visibleRange.start, visibleRange.end, scope, keyword);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleRange, scope, keyword]);

  const refetch = useCallback(() => {
    const r = visibleRangeRef.current ?? visibleRange;
    loadEvents(r.start, r.end, scope, keyword);
  }, [loadEvents, visibleRange, scope, keyword]);

  const handleScopeChange = (_e, next) => {
    if (!next) return;
    if (next === 'TEAM' && !user?.departmentId) {
      toast.error('소속 부서가 없어 팀 일정을 조회할 수 없습니다.');
      return;
    }
    setScope(next);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setKeyword(searchInput);
    const trimmed = searchInput.trim();
    if (!trimmed) return;
    try {
      let nav = searchNavRef.current;
      if (nav.keyword !== trimmed) {
        const wideFrom = new Date(); wideFrom.setFullYear(wideFrom.getFullYear() - 1);
        const wideTo = new Date(); wideTo.setFullYear(wideTo.getFullYear() + 1);
        const matches = await taskApi.getCalendarEvents({ from: wideFrom, to: wideTo, scope, keyword: trimmed });
        if (!Array.isArray(matches) || matches.length === 0) {
          searchNavRef.current = { keyword: trimmed, matches: [], index: -1 };
          return;
        }
        const now = Date.now();
        const sorted = [...matches].sort((a, b) => Math.abs(new Date(a.startDate) - now) - Math.abs(new Date(b.startDate) - now));
        nav = { keyword: trimmed, matches: sorted, index: 0 };
      } else if (nav.matches.length > 0) {
        nav = { ...nav, index: (nav.index + 1) % nav.matches.length };
      } else return;
      searchNavRef.current = nav;
      const target = nav.matches[nav.index];
      const targetDate = new Date(target.startDate);
      const { start, end } = visibleRange;
      const inView = start && end && targetDate >= start && targetDate < end;
      if (!inView) setCurrentDate(targetDate);
      if (nav.matches.length > 1) {
        toast.success(`'${target.title}' (${nav.index + 1}/${nav.matches.length})로 이동합니다. 다시 검색하면 다음 결과로 이동합니다.`);
      }
    } catch (err) {
      toast.apiError(err);
    }
  };

  const toggleType = (code) => setTypeFilter((prev) => prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]);
  const toggleCategory = (id) => setCategoryFilter((prev) => (prev ?? []).includes(id) ? prev.filter((c) => c !== id) : [...(prev ?? []), id]);

  const goPrev = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      if (viewType === 'month') d.setMonth(d.getMonth() - 1);
      else if (viewType === 'week' || viewType === 'list') d.setDate(d.getDate() - 7);
      else d.setDate(d.getDate() - 1);
      return d;
    });
  };

  const goNext = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      if (viewType === 'month') d.setMonth(d.getMonth() + 1);
      else if (viewType === 'week' || viewType === 'list') d.setDate(d.getDate() + 7);
      else d.setDate(d.getDate() + 1);
      return d;
    });
  };

  const goToday = () => setCurrentDate(new Date());

  const handleViewChange = (_e, next) => { if (next) setViewType(next); };

  const events = useMemo(
    () =>
      rawTasks
        .filter(t => typeFilter.includes(t.taskType))
        .filter(t => {
          if (categoryFilter === null) return true;
          const cid = t.categoryId;
          if (cid != null && !categories.some(c => c.id === cid)) return true;
          return categoryFilter.includes(cid ?? 'NONE');
        })
        .map(t => {
          const category = categories.find(c => c.id === t.categoryId);
          const isTimeGrid = viewType === 'week' || viewType === 'day';
          const startDay = t.startDate?.slice(0, 10);
          const endDay = t.endDate?.slice(0, 10);
          const spansMultipleDays = startDay && endDay && startDay !== endDay;
          const forceAllDay = isTimeGrid && spansMultipleDays;
          const color = category?.color ?? '#90a4ae';
          const endDate = exclusiveEnd(t);
          return {
            id: String(t.id),
            title: t.title,
            start: parseLocalDate(t.startDate),
            end: endDate ?? parseLocalDate(t.startDate),
            allDay: forceAllDay || Boolean(t.allDay),
            backgroundColor: color,
            raw: t,
          };
        }),
    [rawTasks, typeFilter, categoryFilter, categories, viewType],
  );

  const eventPropGetter = useCallback((event) => ({
    style: {
      backgroundColor: event.backgroundColor,
      borderColor: 'transparent',
      borderRadius: '999px',
      fontSize: '11px',
      fontWeight: 600,
      color: '#fff',
      opacity: 0.92,
    },
  }), []);

  const dayPropGetter = useCallback((date) => {
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    return isToday ? { style: { backgroundColor: 'rgba(58,174,169,0.04)' } } : {};
  }, []);

  const handleSelectSlot = ({ start, end }) => {
    // 월뷰에서 빈 날짜를 클릭하면 RBC 가 start===end(당일 00:00) 로 넘긴다.
    // 그대로 넘기면 0분짜리 이벤트가 되므로 기본 1시간 duration 을 부여.
    const startMs = new Date(start).getTime();
    const endMs = new Date(end).getTime();
    const normalizedEnd = endMs - startMs < 60 * 60 * 1000
      ? new Date(startMs + 60 * 60 * 1000)
      : end;
    setEditingTask(null);
    setDefaultStart(start);
    setDefaultEnd(normalizedEnd);
    setFormOpen(true);
  };

  const handleSelectEvent = (event) => setDetailId(Number(event.id));

  const handleEventDrop = async ({ event, start, end, isAllDay }) => {
    const raw = event.raw;
    if (!raw) return;
    // event.allDay 는 forceAllDay(다중일 timed → 표시상 allDay) 를 포함하므로
    // 서버 저장용 원본은 raw.allDay 를 사용해야 timed → allDay 로 뒤바뀌지 않는다.
    // RBC 가 명시적으로 isAllDay 를 넘긴 경우(월↔주 뷰간 드래그로 변환)만 반영.
    const nextAllDay = typeof isAllDay === 'boolean' ? isAllDay : Boolean(raw.allDay);

    let endForApi = end;
    if (nextAllDay) {
      const e = new Date(end);
      e.setDate(e.getDate() - 1);
      endForApi = e < new Date(start) ? new Date(start) : e;
      // allDay 원본의 endDate 는 23:59 같은 time-of-day 를 가질 수 있는데,
      // exclusiveEnd 로 왕복하면 00:00 로 잘린다. 원본 종료 날짜와 계산 날짜가
      // 같은 날이면 원본 시분초를 그대로 유지해서 드리프트 방지.
      if (raw.endDate && raw.allDay) {
        const origEnd = new Date(raw.endDate);
        if (origEnd.toDateString() === endForApi.toDateString()) {
          endForApi = origEnd;
        }
      }
    }
    try {
      await taskApi.updateTask(raw.id, {
        title: raw.title,
        description: raw.description,
        startDate: fromDateTimeInputValue(toDateTimeInputValue(start)),
        endDate: fromDateTimeInputValue(toDateTimeInputValue(endForApi)),
        allDay: nextAllDay,
        visibility: raw.visibility,
        priority: raw.priority,
        categoryId: raw.categoryId,
      });
      toast.success('일정을 옮겼습니다.');
      refetch();
    } catch (err) {
      toast.apiError(err);
      refetch();
    }
  };

  const handleEventResize = async ({ event, start, end }) => {
    const raw = event.raw;
    if (!raw) return;
    // handleEventDrop 과 같은 이유로 raw.allDay 사용 (forceAllDay 반영 방지).
    const nextAllDay = Boolean(raw.allDay);
    let endForApi = end;
    if (nextAllDay) {
      const e = new Date(end);
      e.setDate(e.getDate() - 1);
      endForApi = e < new Date(start) ? new Date(start) : e;
      if (raw.endDate) {
        const origEnd = new Date(raw.endDate);
        if (origEnd.toDateString() === endForApi.toDateString()) {
          endForApi = origEnd;
        }
      }
    }
    try {
      await taskApi.updateTask(raw.id, {
        title: raw.title,
        description: raw.description,
        startDate: fromDateTimeInputValue(toDateTimeInputValue(start)),
        endDate: fromDateTimeInputValue(toDateTimeInputValue(endForApi)),
        allDay: nextAllDay,
        visibility: raw.visibility,
        priority: raw.priority,
        categoryId: raw.categoryId,
      });
      toast.success('일정을 변경했습니다.');
      refetch();
    } catch (err) {
      toast.apiError(err);
      refetch();
    }
  };

  const openCreate = () => {
    setEditingTask(null);
    setDefaultStart(new Date());
    setDefaultEnd(null);
    setFormOpen(true);
  };

  useEffect(() => {
    listCategories()
      .then(list => {
        const arr = Array.isArray(list) ? list : [];
        setCategories(arr);
        setCategoryFilter([...arr.map(c => c.id), 'NONE']);
      })
      .catch(() => setCategories([]));
  }, []);

  return (
    <Box>
      {/* 페이지 헤더 */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexGrow: 1 }}>
          <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: 'rgba(58,174,169,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CalendarMonthIcon sx={{ color: 'primary.light', fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="h5">캘린더</Typography>
            <Typography variant="caption" color="text.secondary">일정·할 일·WBS를 한 눈에</Typography>
          </Box>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} sx={{ borderRadius: 999 }}>
          일정 등록
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        {/* 좌측 필터 사이드바 */}
        <Card sx={{ width: 220, flexShrink: 0, position: 'sticky', top: 16, overflow: 'hidden' }}>
          <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #e2e5ea', bgcolor: '#f8f9fb', display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterListIcon sx={{ fontSize: 16, color: 'primary.light' }} />
            <Typography variant="subtitle2">필터</Typography>
          </Box>
          <Box sx={{ p: 2 }}>
            <ToggleButtonGroup
              value={scope} exclusive fullWidth size="small"
              onChange={handleScopeChange}
              sx={{ ...segmentedToggleSx, mb: 2.5, display: 'flex' }}
            >
              <ToggleButton value="MY">내 일정</ToggleButton>
              <ToggleButton value="TEAM">팀 일정</ToggleButton>
            </ToggleButtonGroup>

            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.5, fontSize: '0.68rem' }}>
              종류
            </Typography>
            <FormGroup sx={{ mb: 1.5 }}>
              {Object.entries(TASK_TYPE).map(([code, label]) => (
                <FormControlLabel
                  key={code}
                  sx={{ ml: 0, gap: 0.5, '& .MuiFormControlLabel-label': { fontSize: '0.84rem' } }}
                  control={
                    <Checkbox
                      size="small"
                      checked={typeFilter.includes(code)}
                      onChange={() => toggleType(code)}
                      sx={{ color: TYPE_DOT_COLOR[code], p: 0.5, '&.Mui-checked': { color: TYPE_DOT_COLOR[code] } }}
                    />
                  }
                  label={label}
                />
              ))}
            </FormGroup>

            {categories.length > 0 && (
              <>
                <Divider sx={{ mb: 1.5 }} />
                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.5, fontSize: '0.68rem' }}>
                  카테고리
                </Typography>
                <FormGroup>
                  {categories.map(c => (
                    <FormControlLabel
                      key={c.id}
                      sx={{ ml: 0, gap: 0.5, '& .MuiFormControlLabel-label': { fontSize: '0.84rem' } }}
                      control={
                        <Checkbox
                          size="small"
                          checked={(categoryFilter ?? []).includes(c.id)}
                          onChange={() => toggleCategory(c.id)}
                          sx={{ color: c.color || 'grey.500', p: 0.5, '&.Mui-checked': { color: c.color || 'grey.500' } }}
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: c.color || '#ccc', flexShrink: 0 }} />
                          {c.name}
                        </Box>
                      }
                    />
                  ))}
                  <FormControlLabel
                    sx={{ ml: 0, gap: 0.5, '& .MuiFormControlLabel-label': { fontSize: '0.84rem' } }}
                    control={
                      <Checkbox
                        size="small"
                        checked={(categoryFilter ?? []).includes('NONE')}
                        onChange={() => toggleCategory('NONE')}
                        sx={{ p: 0.5 }}
                      />
                    }
                    label="미지정"
                  />
                </FormGroup>
              </>
            )}
          </Box>
        </Card>

        {/* 메인 캘린더 영역 */}
        <Card sx={{ flexGrow: 1, minWidth: 0 }}>
          {/* 캘린더 툴바 */}
          <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid #e2e5ea', bgcolor: '#f8f9fb' }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr auto 1fr' }, alignItems: 'center', rowGap: 1 }}>
              <ToggleButtonGroup
                value={viewType} exclusive size="small"
                onChange={handleViewChange}
                sx={{ ...segmentedToggleSx, justifySelf: { xs: 'center', md: 'start' } }}
              >
                {VIEW_OPTIONS.map(v => <ToggleButton key={v.value} value={v.value}>{v.label}</ToggleButton>)}
              </ToggleButtonGroup>

              <Stack direction="row" alignItems="center" spacing={1} sx={{ justifySelf: 'center' }}>
                <IconButton size="small" onClick={goPrev} sx={{ bgcolor: 'background.default', border: '1px solid #e2e5ea' }}>
                  <ChevronLeftIcon fontSize="small" />
                </IconButton>
                <Typography variant="subtitle1" fontWeight={700} sx={{ minWidth: 110, textAlign: 'center' }}>{title}</Typography>
                <IconButton size="small" onClick={goNext} sx={{ bgcolor: 'background.default', border: '1px solid #e2e5ea' }}>
                  <ChevronRightIcon fontSize="small" />
                </IconButton>
              </Stack>

              <Stack direction="row" alignItems="center" spacing={1} sx={{ justifySelf: { xs: 'center', md: 'end' }, flexWrap: 'wrap' }}>
                <Button
                  size="small" variant="outlined" onClick={goToday}
                  sx={{ borderRadius: 999, borderColor: '#A2D5AB', color: '#4E8A5A', fontSize: '0.78rem' }}
                >
                  오늘
                </Button>
                <Box component="form" onSubmit={handleSearch}>
                  <TextField
                    size="small" placeholder="제목·설명 검색"
                    value={searchInput} onChange={e => setSearchInput(e.target.value)}
                    sx={pillSearchSx}
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                      },
                    }}
                  />
                </Box>
              </Stack>
            </Box>
          </Box>

          <Box sx={{ p: 2, height: 700 }}>
            <DnDCalendar
              localizer={localizer}
              culture="ko"
              events={events}
              view={RBC_VIEW_MAP[viewType]}
              date={currentDate}
              onNavigate={setCurrentDate}
              onView={() => {}}
              toolbar={false}
              popup
              selectable

              messages={MESSAGES}
              formats={FORMATS}
              style={{ height: '100%' }}
              eventPropGetter={eventPropGetter}
              dayPropGetter={dayPropGetter}
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              onEventDrop={handleEventDrop}
              onEventResize={handleEventResize}
            />
          </Box>
        </Card>
      </Box>

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
        onEdit={task => {
          setDetailId(null);
          setEditingTask(task);
          setFormOpen(true);
        }}
      />
    </Box>
  );
}

function parseLocalDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }
  return new Date(s);
}

function exclusiveEnd(task) {
  if (!task.endDate) return null;
  const end = parseLocalDate(task.endDate);
  if (!task.allDay) return end;
  end.setDate(end.getDate() + 1);
  end.setHours(0, 0, 0, 0);
  return end;
}
