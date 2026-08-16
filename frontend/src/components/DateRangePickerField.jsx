import { useState } from 'react';
import { Box, Button, Popover, Typography } from '@mui/material';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import DateRangeIcon from '@mui/icons-material/DateRange';

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

function label(dateStr) {
  if (!dateStr) return null;
  const [, m, d] = dateStr.split('-');
  return `${Number(m)}/${Number(d)}`;
}

export default function DateRangePickerField({ from, to, onChange, placeholder = '기간 선택' }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const range = { from: parseDateOnly(from), to: parseDateOnly(to) };
  const summary =
    from || to ? `${label(from) ?? '-'} ~ ${label(to) ?? '-'}` : placeholder;

  const handleSelect = (next) => {
    onChange(next?.from ? formatDateOnly(next.from) : '', next?.to ? formatDateOnly(next.to) : '');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('', '');
  };

  return (
    <Box>
      <Button
        variant="outlined"
        color="inherit"
        startIcon={<DateRangeIcon fontSize="small" />}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        onDoubleClick={handleClear}
        sx={{
          height: 40,
          px: '14px',
          fontWeight: 400,
          fontSize: '0.875rem',
          whiteSpace: 'nowrap',
          borderColor: 'rgba(0, 0, 0, 0.23)',
          color: from || to ? 'text.primary' : 'text.secondary',
          '&:hover': { borderColor: 'text.primary' },
        }}
      >
        {summary}
      </Button>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 2 }}>
          <DayPicker mode="range" numberOfMonths={2} selected={range} onSelect={handleSelect} weekStartsOn={1} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1 }}>
            <Typography variant="caption" color="text.secondary">
              시작일을 먼저 클릭하고 종료일을 클릭하세요.
            </Typography>
            <Button size="small" color="secondary" onClick={() => onChange('', '')}>
              초기화
            </Button>
          </Box>
        </Box>
      </Popover>
    </Box>
  );
}
