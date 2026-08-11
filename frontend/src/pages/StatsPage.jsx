import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  LinearProgress,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';

import * as statsApi from '../api/stats';
import * as taskApi from '../api/tasks';
import NotReadyNotice from '../components/NotReadyNotice';
import { STATUS } from '../utils/constants';

const STATUS_BAR_COLOR = {
  TODO: '#90a4ae',
  IN_PROGRESS: '#1976d2',
  DONE: '#2e7d32',
  CANCELLED: '#c62828',
};

/**
 * STEP 16 — 개인 통계.
 *
 * 차트 라이브러리를 쓰지 않고 <Box>의 너비를 퍼센트로 조절해 막대를 그린다.
 * (의존성을 늘리지 않으려는 선택이자, 비율 → 픽셀 환산이 어떻게 되는지 보여주는 예)
 */
export default function StatsPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const [statusCounts, setStatusCounts] = useState({});
  const [total, setTotal] = useState(0);
  const [usingFallback, setUsingFallback] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await statsApi.getPersonalStats(year, month);
      setStatusCounts(data.statusCounts ?? {});
      setTotal(data.total ?? 0);
      setUsingFallback(false);
    } catch (err) {
      if (!err.notReady) {
        setLoading(false);
        return;
      }
      // ── 폴백 ── 내 투두를 받아 클라이언트에서 상태별로 센다.
      // reduce는 "배열 → 하나의 객체"로 접는 대표적인 패턴이다.
      setUsingFallback(true);
      const todos = await taskApi.getMyTodos({}).catch(() => []);
      const counts = todos.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] ?? 0) + 1;
        return acc;
      }, {});
      setStatusCounts(counts);
      setTotal(todos.length);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    load();
  }, [load]);

  const maxCount = Math.max(1, ...Object.values(statusCounts));

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>
          개인 통계
        </Typography>
        <TextField
          select
          size="small"
          label="연도"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          sx={{ minWidth: 110 }}
        >
          {[today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1].map((y) => (
            <MenuItem key={y} value={y}>
              {y}년
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="월"
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          sx={{ minWidth: 90 }}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <MenuItem key={m} value={m}>
              {m}월
            </MenuItem>
          ))}
        </TextField>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {usingFallback && (
        <NotReadyNotice step="STEP 16" api="GET /api/stats/personal">
          <Typography variant="body2" sx={{ mt: 1 }}>
            현재는 내 투두 목록을 받아 브라우저에서 상태별로 집계한 값입니다. 월 필터는
            백엔드 구현 후에 적용됩니다.
          </Typography>
        </NotReadyNotice>
      )}

      <Card variant="outlined">
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
    </Box>
  );
}
