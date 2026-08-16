import { useState } from 'react';
import { Box, Button, Popover, TextField, Typography } from '@mui/material';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import DateRangeIcon from '@mui/icons-material/DateRange';

function splitDateTime(value) {
  if (!value) return { date: '', time: '' };
  const [date, time] = value.split('T');
  return { date, time: time ?? '' };
}

function joinDateTime(date, time) {
  if (!date) return '';
  return `${date}T${time || '00:00'}`;
}

function parseDateOnly(dateStr) {
  if (!dateStr) return undefined;
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDateOnly(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatSummary(startDate, endDate, allDay) {
  const start = splitDateTime(startDate);
  const end = splitDateTime(endDate);
  if (!start.date && !end.date) return '기간 선택';

  const label = (date, time) => {
    if (!date) return '-';
    const [, m, d] = date.split('-');
    const dateLabel = `${Number(m)}/${Number(d)}`;
    return allDay || !time ? dateLabel : `${dateLabel} ${time}`;
  };
  return `${label(start.date, start.time)} ~ ${label(end.date, end.time)}`;
}

/**
 * 시작/종료를 datetime-local input 두 개로 따로 받는 대신,
 * 캘린더에서 범위를 한 번에 고르는 필드. allDay가 아니면 시간 입력을 같이 보여준다.
 */
export default function DateRangeField({ startDate, endDate, allDay, onChange }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const start = splitDateTime(startDate);
  const end = splitDateTime(endDate);
  const range = { from: parseDateOnly(start.date), to: parseDateOnly(end.date) };

  const handleRangeSelect = (next) => {
    const nextStart = next?.from ? formatDateOnly(next.from) : '';
    const nextEnd = next?.to ? formatDateOnly(next.to) : nextStart;
    onChange(
      joinDateTime(nextStart, start.time || '09:00'),
      joinDateTime(nextEnd, end.time || '18:00')
    );
  };

  const handleStartTime = (e) => {
    onChange(joinDateTime(start.date, e.target.value), endDate);
  };

  const handleEndTime = (e) => {
    onChange(startDate, joinDateTime(end.date, e.target.value));
  };

  return (
    <Box sx={{ gridColumn: '1 / -1', display: 'grid', gap: 1 }}>
      <Button
        variant="outlined"
        color="inherit"
        startIcon={<DateRangeIcon />}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{ justifyContent: 'flex-start', fontWeight: 400, py: 1 }}
      >
        {formatSummary(startDate, endDate, allDay)}
      </Button>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 2 }}>
          <DayPicker
            mode="range"
            numberOfMonths={2}
            selected={range}
            onSelect={handleRangeSelect}
            weekStartsOn={1}
          />

          {!allDay && (
            <Box sx={{ display: 'flex', gap: 2, px: 1, pb: 1 }}>
              <TextField
                label="시작 시간"
                type="time"
                size="small"
                value={start.time || '09:00'}
                onChange={handleStartTime}
                disabled={!start.date}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="종료 시간"
                type="time"
                size="small"
                value={end.time || '18:00'}
                onChange={handleEndTime}
                disabled={!end.date}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Box>
          )}

          {!range.from && (
            <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
              시작일을 먼저 클릭하고 종료일을 클릭하세요.
            </Typography>
          )}
        </Box>
      </Popover>
    </Box>
  );
}
