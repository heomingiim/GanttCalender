import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  LinearProgress,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';

import * as statsApi from '../api/stats';
import { STATUS } from '../utils/constants';

const STATUS_BAR_COLOR = {
  TODO: '#90a4ae',
  IN_PROGRESS: '#1976d2',
  DONE: '#2e7d32',
  CANCELLED: '#c62828',
};

const UNITS = [
  { value: 'DAY', label: '일별' },
  { value: 'WEEK', label: '주별' },
  { value: 'MONTH', label: '월별' },
];

// 2026-08 → 8월, 2026-W33 → 33주차, 2026-08-12 → 8/12
function periodLabel(period) {
  const week = period.match(/^\d{4}-W(\d{2})$/);
  if (week) return `${Number(week[1])}주차`;

  const day = period.match(/^\d{4}-(\d{2})-(\d{2})$/);
  if (day) return `${Number(day[1])}/${Number(day[2])}`;

  const month = period.match(/^\d{4}-(\d{2})$/);
  if (month) return `${Number(month[1])}월`;

  return period;
}

/**
 * 개인 통계.
 *
 * 차트 라이브러리를 쓰지 않고 <Box>의 너비를 퍼센트로 조절해 막대를 그린다.
 * (의존성을 늘리지 않으려는 선택이자, 비율 → 픽셀 환산이 어떻게 되는지 보여주는 예)
 */
export default function StatsPage() {
  const [unit, setUnit] = useState('MONTH');
  // 빈 문자열이면 서버가 기본 구간을 정한다
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [statusCounts, setStatusCounts] = useState({});
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await statsApi.getPersonalStats({
        unit,
        from: from || undefined,
        to: to || undefined,
      });
      setStatusCounts(data.statusCounts ?? {});
      setRows(data.rows ?? []);
      setTotal(data.total ?? 0);

      if (!from && data.from) setFrom(data.from);
      if (!to && data.to) setTo(data.to);
    } catch (err) {
      setError(err.message ?? '통계를 불러오지 못했습니다.');
      setStatusCounts({});
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [unit, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUnitChange = (value) => {
    setUnit(value);
    setFrom('');
    setTo('');
  };

  const maxCount = Math.max(1, ...Object.values(statusCounts));

  // rows는 (구간 × 상태) 한 줄씩이라, 구간 기준으로 다시 묶는다
  const periods = useMemo(() => {
    const map = new Map();
    for (const row of rows) {
      if (!map.has(row.period)) map.set(row.period, { period: row.period, counts: {}, sum: 0 });
      const entry = map.get(row.period);
      entry.counts[row.status] = (entry.counts[row.status] ?? 0) + row.count;
      entry.sum += row.count;
    }
    return [...map.values()];
  }, [rows]);

  const maxPeriodSum = Math.max(1, ...periods.map((p) => p.sum));

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>
          개인 통계
        </Typography>
        <TextField
          select
          size="small"
          label="집계 단위"
          value={unit}
          onChange={(e) => handleUnitChange(e.target.value)}
          sx={{ minWidth: 110 }}
        >
          {UNITS.map((u) => (
            <MenuItem key={u.value} value={u.value}>
              {u.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          type="date"
          size="small"
          label="시작일"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          type="date"
          size="small"
          label="종료일"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
            상태별 작업 수
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            전체 {total}건
          </Typography>

          {total === 0 && (
            <Typography color="text.secondary">집계할 작업이 없습니다.</Typography>
          )}

          <Box sx={{ display: 'grid', gap: 2 }}>
            {Object.entries(STATUS).map(([code, label]) => {
              const count = statusCounts[code] ?? 0;
              // 가장 큰 값을 100%로 두고 나머지를 상대 비율로 그린다
              const widthPercent = (count / maxCount) * 100;
              const share = total > 0 ? Math.round((count / total) * 100) : 0;

              return (
                <Box key={code} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2" sx={{ width: 60, flexShrink: 0 }}>
                    {label}
                  </Typography>
                  <Box
                    sx={{
                      flexGrow: 1,
                      height: 22,
                      bgcolor: 'action.hover',
                      borderRadius: 1,
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      sx={{
                        width: `${widthPercent}%`,
                        height: '100%',
                        bgcolor: STATUS_BAR_COLOR[code],
                        transition: 'width .3s ease',
                      }}
                    />
                  </Box>
                  <Typography variant="body2" sx={{ width: 90, flexShrink: 0, textAlign: 'right' }}>
                    {count}건 ({share}%)
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
            구간별 추이
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            막대 하나가 한 구간이고, 색이 상태 비중입니다.
          </Typography>

          {periods.length === 0 ? (
            <Typography color="text.secondary">표시할 구간이 없습니다.</Typography>
          ) : (
            <Box sx={{ display: 'grid', gap: 1.5 }}>
              {periods.map((p) => (
                <Box key={p.period} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2" sx={{ width: 60, flexShrink: 0 }}>
                    {periodLabel(p.period)}
                  </Typography>
                  <Box
                    sx={{
                      flexGrow: 1,
                      height: 22,
                      bgcolor: 'action.hover',
                      borderRadius: 1,
                      overflow: 'hidden',
                      display: 'flex',
                      width: `${(p.sum / maxPeriodSum) * 100}%`,
                      minWidth: 4,
                    }}
                  >
                    {Object.keys(STATUS).map((code) => {
                      const count = p.counts[code] ?? 0;
                      if (count === 0) return null;
                      return (
                        <Tooltip key={code} title={`${STATUS[code]} ${count}건`}>
                          <Box
                            sx={{
                              width: `${(count / p.sum) * 100}%`,
                              bgcolor: STATUS_BAR_COLOR[code],
                            }}
                          />
                        </Tooltip>
                      );
                    })}
                  </Box>
                  <Typography variant="body2" sx={{ width: 50, flexShrink: 0, textAlign: 'right' }}>
                    {p.sum}건
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
