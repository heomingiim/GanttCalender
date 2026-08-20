import { useState } from 'react';
import { Box, Button, Popover, Typography } from '@mui/material';
import { TimePicker, renderMultiSectionDigitalClockTimeView } from '@mui/x-date-pickers';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import DateRangeIcon from '@mui/icons-material/DateRange';
import dayjs from 'dayjs';
import { formatShortDate, parseDateOnly, toLocalDateString } from '../utils/date';

function splitDateTime(value) {
  if (!value) return { date: '', time: '' };
  const [date, time] = value.split('T');
  return { date, time: time ?? '' };
}

function joinDateTime(date, time) {
  if (!date) return '';
  return `${date}T${time || '00:00'}`;
}

function formatSummary(startDate, endDate, allDay) {
  const start = splitDateTime(startDate);
  const end = splitDateTime(endDate);
  if (!start.date && !end.date) return '기간 선택';

  const label = (date, time) =>
    allDay || !time ? formatShortDate(date) : `${formatShortDate(date)} ${time}`;
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
    const nextStart = next?.from ? toLocalDateString(next.from) : '';
    const nextEnd = next?.to ? toLocalDateString(next.to) : nextStart;
    onChange(
      joinDateTime(nextStart, start.time || '09:00'),
      joinDateTime(nextEnd, end.time || '18:00')
    );
  };

  const handleStartTime = (value) => {
    const time = value ? value.format('HH:mm') : '09:00';
    onChange(joinDateTime(start.date, time), endDate);
  };

  const handleEndTime = (value) => {
    const time = value ? value.format('HH:mm') : '18:00';
    onChange(startDate, joinDateTime(end.date, time));
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
              <TimePicker
                label="시작 시간"
                value={start.time ? dayjs(`2000-01-01T${start.time}`) : dayjs('2000-01-01T09:00')}
                onChange={handleStartTime}
                disabled={!start.date}
                ampm={false}
                timeSteps={{ minutes: 5 }}
                viewRenderers={{
                  hours: renderMultiSectionDigitalClockTimeView,
                  minutes: renderMultiSectionDigitalClockTimeView,
                }}
                slotProps={{
                  textField: { size: 'small', sx: { width: 130 } },
                  popper: {
                    sx: {
                      '& .MuiMultiSectionDigitalClockSection-item': { fontSize: '0.8rem', py: 0.5, minHeight: 32 },
                      '& .MuiMultiSectionDigitalClock-root': { maxHeight: 200, overflow: 'auto' },
                      '& .MuiMultiSectionDigitalClockSection-root': { width: 60 },
                      '& .MuiPaper-root': { width: 130 },
                    },
                  },
                }}
              />
              <TimePicker
                label="종료 시간"
                value={end.time ? dayjs(`2000-01-01T${end.time}`) : dayjs('2000-01-01T18:00')}
                onChange={handleEndTime}
                disabled={!end.date}
                ampm={false}
                timeSteps={{ minutes: 5 }}
                viewRenderers={{
                  hours: renderMultiSectionDigitalClockTimeView,
                  minutes: renderMultiSectionDigitalClockTimeView,
                }}
                slotProps={{
                  textField: { size: 'small', sx: { width: 130 } },
                  popper: {
                    sx: {
                      '& .MuiMultiSectionDigitalClockSection-item': { fontSize: '0.8rem', py: 0.5, minHeight: 32 },
                      '& .MuiMultiSectionDigitalClock-root': { maxHeight: 200, overflow: 'auto' },
                      '& .MuiMultiSectionDigitalClockSection-root': { width: 60 },
                      '& .MuiPaper-root': { width: 130 },
                    },
                  },
                }}
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
