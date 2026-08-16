import {
  Box,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

import {
  buildWorkdayColumns,
  dayRangeIndex,
  withDisplayNumbers,
} from '../utils/taskTree';
import { STATUS, STATUS_BAR_COLOR, STATUS_COLOR } from '../utils/constants';
import { toLocalDateString } from '../utils/date';

const DAY_COL_WIDTH = 42;

function shortDate(value) {
  if (!value) return '-';
  const [, m, d] = toLocalDateString(value).split('-');
  return `${Number(m)}/${Number(d)}`;
}

// 날짜 칸에 배경색을 칠해 막대를 표현한다.
function DayCells({ days, startDate, endDate, status }) {
  const range = dayRangeIndex(days, startDate, endDate);
  const barColor = STATUS_BAR_COLOR[status] ?? STATUS_BAR_COLOR.TODO;

  return days.map((d, i) => {
    const inRange = range && i >= range.startIdx && i <= range.endIdx;
    const isStart = range && i === range.startIdx;
    const isEnd = range && i === range.endIdx;
    return (
      <TableCell
        key={i}
        sx={{
          width: DAY_COL_WIDTH,
          p: 0,
          height: 28,
          bgcolor: inRange ? barColor : d.weekend ? 'action.hover' : undefined,
          borderTopLeftRadius: isStart ? 6 : 0,
          borderBottomLeftRadius: isStart ? 6 : 0,
          borderTopRightRadius: isEnd ? 6 : 0,
          borderBottomRightRadius: isEnd ? 6 : 0,
        }}
      />
    );
  });
}

// WBS 표 + 간트를 한 화면에 합친 뷰. 최상위 작업은 단계 라벨로,
// 하위 작업은 담당자·기간·산출물·막대가 있는 일반 행으로 그린다.
export default function WbsGanttTable({
  tasks,
  rangeStart,
  rangeEnd,
  onRowClick,
  onAddChild,
}) {
  const numbered = withDisplayNumbers(tasks);

  let start = rangeStart;
  let end = rangeEnd;
  if (!start || !end) {
    const dates = numbered.flatMap((t) => [t.startDate, t.endDate]).filter(Boolean);
    if (dates.length > 0) {
      const sorted = dates.map((d) => toLocalDateString(d)).sort();
      start = start ?? sorted[0];
      end = end ?? sorted[sorted.length - 1];
    }
  }

  const { days, weeks } = buildWorkdayColumns(start, end);

  if (numbered.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ py: 5, textAlign: 'center' }}>
        작업이 없습니다. WBS 작업을 추가해 보세요.
      </Typography>
    );
  }

  const totalCols = 9;

  return (
    <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
      <Table
        size="small"
        sx={{
          '& .MuiTableCell-root': { py: 0.5, whiteSpace: 'nowrap' },
          '& .MuiTableCell-head': { py: 0.75 },
        }}
      >
        <TableHead>
          <TableRow>
            <TableCell rowSpan={2} sx={{ width: 44 }}>No</TableCell>
            <TableCell rowSpan={2} sx={{ width: 260 }}>작업</TableCell>
            <TableCell rowSpan={2} sx={{ width: 90 }}>담당자</TableCell>
            <TableCell rowSpan={2} align="center" sx={{ width: 56 }}>DAYS</TableCell>
            <TableCell rowSpan={2} sx={{ width: 64 }}>START</TableCell>
            <TableCell rowSpan={2} sx={{ width: 64 }}>END</TableCell>
            <TableCell rowSpan={2} sx={{ width: 160 }}>산출물</TableCell>
            <TableCell rowSpan={2} align="center" sx={{ width: 64 }}>진행률</TableCell>
            <TableCell rowSpan={2} sx={{ width: 90 }}>상태</TableCell>
            {weeks.map((w, i) => (
              <TableCell
                key={i}
                colSpan={w.span}
                align="center"
                sx={{
                  width: w.span * DAY_COL_WIDTH,
                  borderLeft: 1,
                  borderColor: 'divider',
                  fontSize: 12,
                }}
              >
                {w.label}
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            {days.map((d, i) => (
              <TableCell
                key={i}
                align="center"
                sx={{
                  width: DAY_COL_WIDTH,
                  px: 0.25,
                  fontSize: 10,
                  color: 'text.secondary',
                  bgcolor: d.weekend ? 'action.hover' : undefined,
                }}
              >
                {d.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>

        <TableBody>
          {numbered.map((t) => {
            if (t.depth === 0) {
              return (
                <TableRow key={t.id} hover sx={{ bgcolor: 'action.hover' }}>
                  <TableCell
                    colSpan={totalCols}
                    sx={{ cursor: 'pointer' }}
                    onClick={() => onRowClick?.(t.id)}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2" fontWeight={700} sx={{ flexGrow: 1 }}>
                        {t.displayNo}&nbsp;&nbsp;{t.title}
                      </Typography>
                      <Tooltip title="하위 작업 추가">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddChild?.(t.id);
                          }}
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <DayCells days={days} startDate={t.startDate} endDate={t.endDate} status={t.status} />
                </TableRow>
              );
            }

            return (
              <TableRow key={t.id} hover>
                <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{t.displayNo}</TableCell>
                <TableCell
                  sx={{ pl: 1 + t.depth * 2, cursor: 'pointer' }}
                  onClick={() => onRowClick?.(t.id)}
                >
                  {t.title}
                </TableCell>
                <TableCell sx={{ fontSize: 12 }}>{t.assigneeNames || '-'}</TableCell>
                <TableCell align="center" sx={{ fontSize: 12 }}>{t.days ?? '-'}</TableCell>
                <TableCell sx={{ fontSize: 12 }}>{shortDate(t.startDate)}</TableCell>
                <TableCell sx={{ fontSize: 12 }}>{shortDate(t.endDate)}</TableCell>
                <TableCell sx={{ fontSize: 12 }}>{t.deliverable || '-'}</TableCell>
                <TableCell align="center" sx={{ fontSize: 12 }}>{t.progressRate ?? 0}%</TableCell>
                <TableCell>
                  <Chip size="small" color={STATUS_COLOR[t.status]} label={STATUS[t.status] ?? t.status} />
                </TableCell>

                <DayCells days={days} startDate={t.startDate} endDate={t.endDate} status={t.status} />
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
