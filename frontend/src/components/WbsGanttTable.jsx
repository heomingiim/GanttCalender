import { useMemo } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

import {
  buildWorkdayColumns,
  dayRangeIndex,
  withDisplayNumbers,
} from '../utils/taskTree';
import { STATUS, STATUS_BAR_COLOR, STATUS_COLOR } from '../utils/constants';
import { formatShortDate, toLocalDateString } from '../utils/date';

const DAY_COL_WIDTH = 42;

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

function SortableWbsRow({ t, days, onRowClick, onAddChild, canManage }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: t.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: 'relative',
    zIndex: isDragging ? 1 : 'auto',
  };

  const dragHandle = t.canEdit ? (
    <IconButton
      size="small"
      {...attributes}
      {...listeners}
      sx={{ cursor: isDragging ? 'grabbing' : 'grab', color: 'text.disabled' }}
    >
      <DragIndicatorIcon fontSize="small" />
    </IconButton>
  ) : null;

  if (t.depth === 0) {
    return (
      <TableRow
        ref={setNodeRef}
        style={style}
        hover
        sx={{
          bgcolor: '#dcdcdc',
          '& .MuiTableCell-root': { bgcolor: '#dcdcdc' },
          '&:hover': {
            bgcolor: '#d0d0d0',
            '& .MuiTableCell-root': { bgcolor: '#d0d0d0' },
          },
        }}
      >
        <TableCell sx={{ p: 0 }} onClick={(e) => e.stopPropagation()}>
          {dragHandle}
        </TableCell>
        <TableCell
          colSpan={9}
          sx={{ cursor: 'pointer' }}
          onClick={() => onRowClick?.(t.id)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="subtitle1"
              fontWeight={800}
              sx={{ flexGrow: 1, letterSpacing: 0.2 }}
            >
              {t.displayNo}&nbsp;&nbsp;{t.title}
            </Typography>
            {canManage && (
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
            )}
          </Box>
        </TableCell>
        {days.map((d, i) => (
          <TableCell
            key={i}
            sx={{
              width: DAY_COL_WIDTH,
              p: 0,
              height: 28,
              bgcolor: d.weekend ? 'action.hover' : undefined,
            }}
          />
        ))}
      </TableRow>
    );
  }

  return (
    <TableRow ref={setNodeRef} style={style} hover>
      <TableCell sx={{ p: 0 }}>
        {dragHandle}
      </TableCell>
      <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{t.displayNo}</TableCell>
      <TableCell
        sx={{ pl: 1 + t.depth * 2, cursor: 'pointer' }}
        onClick={() => onRowClick?.(t.id)}
      >
        {t.title}
      </TableCell>
      <TableCell sx={{ fontSize: 12 }}>{t.assigneeNames || '-'}</TableCell>
      <TableCell align="center" sx={{ fontSize: 12 }}>{t.days ?? '-'}</TableCell>
      <TableCell sx={{ fontSize: 12 }}>{formatShortDate(t.startDate)}</TableCell>
      <TableCell sx={{ fontSize: 12 }}>{formatShortDate(t.endDate)}</TableCell>
      <TableCell sx={{ fontSize: 12 }}>{t.deliverable || '-'}</TableCell>
      <TableCell align="center" sx={{ fontSize: 12 }}>{t.progressRate ?? 0}%</TableCell>
      <TableCell>
        <Chip size="small" color={STATUS_COLOR[t.status]} label={STATUS[t.status] ?? t.status} />
      </TableCell>
      <DayCells days={days} startDate={t.startDate} endDate={t.endDate} status={t.status} />
    </TableRow>
  );
}

export default function WbsGanttTable({
  tasks,
  rangeStart,
  rangeEnd,
  onRowClick,
  onAddChild,
  onReorder,
  canManage = true,
}) {
  const numbered = useMemo(() => withDisplayNumbers(tasks), [tasks]);

  const siblingGroups = useMemo(() => {
    const map = new Map();
    for (const t of numbered) {
      const list = map.get(t.parentTaskId) ?? [];
      list.push(t.id);
      map.set(t.parentTaskId, list);
    }
    return map;
  }, [numbered]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const activeTask = numbered.find((t) => t.id === active.id);
    const overTask = numbered.find((t) => t.id === over.id);
    if (!activeTask || !overTask) return;
    if (!activeTask.canEdit) return;
    if (activeTask.parentTaskId !== overTask.parentTaskId) return;

    const group = [...(siblingGroups.get(activeTask.parentTaskId) ?? [])];
    const oldIndex = group.indexOf(active.id);
    const newIndex = group.indexOf(over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const next = [...group];
    next.splice(oldIndex, 1);
    next.splice(newIndex, 0, active.id);
    onReorder?.(next);
  };

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

  const { days, weeks } = useMemo(() => buildWorkdayColumns(start, end), [start, end]);

  if (numbered.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ py: 5, textAlign: 'center' }}>
        작업이 없습니다. WBS 작업을 추가해 보세요.
      </Typography>
    );
  }

  const allIds = numbered.map((t) => t.id);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={allIds} strategy={verticalListSortingStrategy}>
        <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: '#ffffff' }}>
          <Table
            size="small"
            sx={{
              '& .MuiTableCell-root': { py: 0.5, whiteSpace: 'nowrap' },
              '& .MuiTableCell-head': { py: 0.75 },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell rowSpan={2} sx={{ width: 44 }} />
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
              {numbered.map((t) => (
                <SortableWbsRow
                  key={t.id}
                  t={t}
                  days={days}
                  onRowClick={onRowClick}
                  onAddChild={onAddChild}
                  canManage={canManage}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </SortableContext>
    </DndContext>
  );
}
