import { useCallback, useEffect, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import {
  Box,
  Button,
  Card,
  InputAdornment,
  Paper,
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
import { PRIORITY_HEX } from '../utils/constants';
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

  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [scope, setScope] = useState('MY');
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');

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

        // 서버 Task → FullCalendar event 객체로 변환
        setEvents(
          list.map((t) => ({
            id: String(t.id),
            title: t.title,
            start: t.startDate,
            end: t.endDate,
            allDay: Boolean(t.allDay),
            backgroundColor: PRIORITY_HEX[t.priority] ?? PRIORITY_HEX.MEDIUM,
            borderColor: 'transparent',
            extendedProps: { raw: t }, // 원본을 들고 있다가 클릭 시 사용
          }))
        );
      } catch (err) {
        toast.apiError(err);
        setEvents([]);
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
        endDate: fromDateTimeInputValue(toInputLocal(info.event.end ?? info.event.start)),
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
      .then((list) => setCategories(Array.isArray(list) ? list : []))
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

// Date → 'YYYY-MM-DDTHH:mm' (datetime-local 형식). 위 fromDateTimeInputValue와 짝
function toInputLocal(date) {
  if (!date) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}
