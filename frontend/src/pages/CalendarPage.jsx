import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
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

const VIEW_OPTIONS = [
  { value: 'dayGridMonth', label: '월간' },
  { value: 'timeGridWeek', label: '주간' },
  { value: 'timeGridDay', label: '일간' },
  { value: 'listWeek', label: '목록' },
];

export default function CalendarPage() {
  const toast = useToast();
  const { user } = useAuth();
  const calendarRef = useRef(null);

  const [rawTasks, setRawTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [scope, setScope] = useState('MY');
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [typeFilter, setTypeFilter] = useState(Object.keys(TASK_TYPE));
  const [categoryFilter, setCategoryFilter] = useState(null);

  const [viewType, setViewType] = useState('dayGridMonth');
  const [title, setTitle] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [defaultStart, setDefaultStart] = useState(null);
  const [defaultEnd, setDefaultEnd] = useState(null);
  const [detailId, setDetailId] = useState(null);

  const rangeRef = useRef({ start: null, end: null });
  const searchNavRef = useRef({ keyword: '', matches: [], index: -1 });

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
    [toast]
  );

  const handleDatesSet = (info) => {
    rangeRef.current = { start: info.start, end: info.end };
    setViewType(info.view.type);
    setTitle(info.view.title);
    loadEvents(info.start, info.end, scope, keyword);
  };

  const refetch = useCallback(
    (nextScope = scope, nextKeyword = keyword) => {
      const { start, end } = rangeRef.current;
      loadEvents(start, end, nextScope, nextKeyword);
    },
    [loadEvents, scope, keyword]
  );

  const handleScopeChange = (_e, next) => {
    if (!next) return;
    if (next === 'TEAM' && !user?.departmentId) {
      toast.error('소속 부서가 없어 팀 일정을 조회할 수 없습니다.');
      return;
    }
    setScope(next);
    refetch(next, keyword);
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    setKeyword(searchInput);
    refetch(scope, searchInput);

    const trimmed = searchInput.trim();
    if (!trimmed) return;

    try {
      let nav = searchNavRef.current;
      if (nav.keyword !== trimmed) {
        const wideFrom = new Date();
        wideFrom.setFullYear(wideFrom.getFullYear() - 1);
        const wideTo = new Date();
        wideTo.setFullYear(wideTo.getFullYear() + 1);
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
      } else {
        return;
      }
      searchNavRef.current = nav;

      const target = nav.matches[nav.index];
      const targetDate = new Date(target.startDate);
      const { start, end } = rangeRef.current;
      const inView = start && end && targetDate >= start && targetDate < end;
      if (!inView) calendarRef.current?.getApi().gotoDate(targetDate);
      if (nav.matches.length > 1) {
        toast.success(`'${target.title}' (${nav.index + 1}/${nav.matches.length})로 이동합니다. 다시 검색하면 다음 결과로 이동합니다.`);
      }
    } catch (err) {
      toast.apiError(err);
    }
  };

  const toggleType = (code) => setTypeFilter((prev) => prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]);
  const toggleCategory = (id) => setCategoryFilter((prev) => (prev ?? []).includes(id) ? prev.filter((c) => c !== id) : [...(prev ?? []), id]);

  const goPrev = () => calendarRef.current?.getApi().prev();
  const goNext = () => calendarRef.current?.getApi().next();
  const goToday = () => calendarRef.current?.getApi().today();
  const handleViewChange = (_e, next) => {
    if (!next) return;
    const api = calendarRef.current?.getApi();
    api?.changeView(next);
    api?.today();
  };

  const events = useMemo(
    () =>
      rawTasks
        .filter((t) => typeFilter.includes(t.taskType))
        .filter((t) => {
          if (categoryFilter === null) return true;
          const cid = t.categoryId;
          if (cid != null && !categories.some((c) => c.id === cid)) return true;
          return categoryFilter.includes(cid ?? 'NONE');
        })
        .map((t) => {
          const category = categories.find((c) => c.id === t.categoryId);
          const isTimeGrid = viewType.startsWith('timeGrid');
          const startDay = t.startDate?.slice(0, 10);
          const endDay = t.endDate?.slice(0, 10);
          const spansMultipleDays = startDay && endDay && startDay !== endDay;
          const forceAllDay = isTimeGrid && spansMultipleDays;
          return {
            id: String(t.id),
            title: t.title,
            start: t.startDate,
            end: exclusiveEnd(t),
            allDay: forceAllDay || Boolean(t.allDay),
            backgroundColor: category?.color || '#90a4ae',
            borderColor: 'transparent',
            extendedProps: { raw: t },
          };
        }),
    [rawTasks, typeFilter, categoryFilter, categories, viewType]
  );

  const handleDateClick = (info) => {
    setEditingTask(null);
    setDefaultStart(info.date);
    const end = new Date(info.date);
    end.setHours(end.getHours() + 1);
    setDefaultEnd(end);
    setFormOpen(true);
  };

  const handleEventClick = (info) => setDetailId(Number(info.event.id));

  const handleEventDrop = async (info) => {
    const raw = info.event.extendedProps.raw;
    try {
      await taskApi.updateTask(raw.id, {
        title: raw.title,
        description: raw.description,
        startDate: fromDateTimeInputValue(toDateTimeInputValue(info.event.start)),
        endDate: fromDateTimeInputValue(toDateTimeInputValue(inclusiveEnd(info.event))),
        allDay: info.event.allDay,
        visibility: raw.visibility,
        priority: raw.priority,
        categoryId: raw.categoryId,
      });
      toast.success('일정을 옮겼습니다.');
      refetch();
    } catch (err) {
      toast.apiError(err);
      info.revert();
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
      .then((list) => {
        const arr = Array.isArray(list) ? list : [];
        setCategories(arr);
        setCategoryFilter([...arr.map((c) => c.id), 'NONE']);
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
          {/* 카드 헤더 */}
          <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #e2e5ea', bgcolor: '#f8f9fb', display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterListIcon sx={{ fontSize: 16, color: 'primary.light' }} />
            <Typography variant="subtitle2">필터</Typography>
          </Box>

          <Box sx={{ p: 2 }}>
            <ToggleButtonGroup
              value={scope}
              exclusive
              fullWidth
              size="small"
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
                  {categories.map((c) => (
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
        <Card sx={{ flexGrow: 1, minWidth: 0, overflow: 'hidden' }}>
          {/* 캘린더 툴바 */}
          <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid #e2e5ea', bgcolor: '#f8f9fb' }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr auto 1fr' },
                alignItems: 'center',
                rowGap: 1,
              }}
            >
              <ToggleButtonGroup
                value={viewType}
                exclusive
                size="small"
                onChange={handleViewChange}
                sx={{ ...segmentedToggleSx, justifySelf: { xs: 'center', md: 'start' } }}
              >
                {VIEW_OPTIONS.map((v) => (
                  <ToggleButton key={v.value} value={v.value}>{v.label}</ToggleButton>
                ))}
              </ToggleButtonGroup>

              <Stack direction="row" alignItems="center" spacing={1} sx={{ justifySelf: 'center' }}>
                <IconButton size="small" onClick={goPrev} sx={{ bgcolor: 'background.default', border: '1px solid #e2e5ea' }}>
                  <ChevronLeftIcon fontSize="small" />
                </IconButton>
                <Typography variant="subtitle1" fontWeight={700} sx={{ minWidth: 110, textAlign: 'center' }}>
                  {title}
                </Typography>
                <IconButton size="small" onClick={goNext} sx={{ bgcolor: 'background.default', border: '1px solid #e2e5ea' }}>
                  <ChevronRightIcon fontSize="small" />
                </IconButton>
              </Stack>

              <Stack direction="row" alignItems="center" spacing={1} sx={{ justifySelf: { xs: 'center', md: 'end' }, flexWrap: 'wrap' }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={goToday}
                  sx={{ borderRadius: 999, borderColor: '#A2D5AB', color: '#4E8A5A', fontSize: '0.78rem' }}
                >
                  오늘
                </Button>
                <Box component="form" onSubmit={handleSearch}>
                  <TextField
                    size="small"
                    placeholder="제목·설명 검색"
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
              </Stack>
            </Box>
          </Box>

          <Box sx={{ p: 2 }}>
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              locale="ko"
              height="auto"
              headerToolbar={false}
              dayCellContent={(arg) => arg.dayNumberText.replace('일', '')}
              events={events}
              datesSet={handleDatesSet}
              dateClick={handleDateClick}
              eventClick={handleEventClick}
              editable
              eventDisplay="block"
              eventDrop={handleEventDrop}
              eventResize={handleEventDrop}
              dayMaxEvents={3}
              moreLinkText={(n) => `+${n}개 더보기`}
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
        onEdit={(task) => {
          setDetailId(null);
          setEditingTask(task);
          setFormOpen(true);
        }}
      />
    </Box>
  );
}

function exclusiveEnd(task) {
  if (!task.endDate || !task.allDay) return task.endDate;
  const end = new Date(task.endDate);
  end.setDate(end.getDate() + 1);
  return end;
}

function inclusiveEnd(event) {
  if (!event.end) return event.start;
  if (!event.allDay) return event.end;
  const end = new Date(event.end);
  end.setDate(end.getDate() - 1);
  return end < event.start ? event.start : end;
}
