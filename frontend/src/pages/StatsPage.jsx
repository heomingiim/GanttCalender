import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  LinearProgress,
  MenuItem,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';

import * as statsApi from '../api/stats';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { STATUS, STATUS_BAR_COLOR } from '../utils/constants';

const UNITS = [
  { value: 'DAY', label: '일별' },
  { value: 'WEEK', label: '주별' },
  { value: 'MONTH', label: '월별' },
];

// statusCounts를 CSS conic-gradient 문자열로 바꾼다. 차트 라이브러리 없이
// <Box>의 background만으로 원형 그래프를 그리는 방법 — 도넛 하나에 색 구간을
// 각도(0~360deg)로 순서대로 이어 붙이면 된다. 값이 없으면 회색 원 하나로 채운다.
function buildConicGradient(statusCounts, total) {
  if (total === 0) return 'conic-gradient(#e0e0e0 0deg 360deg)';

  let angle = 0;
  const stops = [];
  for (const code of Object.keys(STATUS)) {
    const count = statusCounts[code] ?? 0;
    if (count === 0) continue;
    const next = angle + (count / total) * 360;
    stops.push(`${STATUS_BAR_COLOR[code]} ${angle}deg ${next}deg`);
    angle = next;
  }
  return `conic-gradient(${stops.join(', ')})`;
}

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
  const { user } = useAuth();
  const toast = useToast();

  const [unit, setUnit] = useState('MONTH');
  const [scope, setScope] = useState('MY');
  // 빈 문자열이면 서버가 기본 구간을 정한다
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [statusCounts, setStatusCounts] = useState({});
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 응답이 요청 순서와 다르게 도착할 때(단위를 빠르게 전환) 오래된 응답이
  // 최신 화면을 덮어쓰지 않도록, 매 호출마다 번호를 매기고 가장 최근 것만 반영한다.
  const requestIdRef = useRef(0);
  // from/to를 서버 기본값으로 채운 직후엔 그 값으로 다시 fetch할 필요가 없다
  // (이미 그 기본값으로 받아온 응답을 반영한 뒤이므로) — 아래서만 건너뛴다.
  const skipNextFetchRef = useRef(false);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError('');
    try {
      const data = await statsApi.getPersonalStats({
        unit,
        from: from || undefined,
        to: to || undefined,
        scope,
      });
      if (requestId !== requestIdRef.current) return; // 그 사이 더 최신 요청이 나감

      setStatusCounts(data.statusCounts ?? {});
      setRows(data.rows ?? []);
      setTotal(data.total ?? 0);

      if (!from && data.from) {
        skipNextFetchRef.current = true;
        setFrom(data.from);
      }
      if (!to && data.to) {
        skipNextFetchRef.current = true;
        setTo(data.to);
      }
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err.message ?? '통계를 불러오지 못했습니다.');
      setStatusCounts({});
      setRows([]);
      setTotal(0);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [unit, scope, from, to]);

  useEffect(() => {
    // 방금 load()가 서버 기본값으로 from/to를 채운 것 때문에 이 effect가
    // 다시 실행된 경우라면, 이미 그 값으로 받아온 데이터가 화면에 있으므로
    // 똑같은 요청을 한 번 더 보내지 않는다.
    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
      return;
    }
    load();
  }, [load]);

  const handleUnitChange = (value) => {
    setUnit(value);
    setFrom('');
    setTo('');
  };

  const handleScopeChange = (_e, next) => {
    if (!next) return; // 같은 버튼을 다시 누르면 null이 온다 — 무시
    if (next === 'TEAM' && !user?.departmentId) {
      toast.error('소속 부서가 없어 팀 통계를 조회할 수 없습니다.');
      return;
    }
    setScope(next);
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
          {scope === 'TEAM' ? '팀 통계' : '개인 통계'}
        </Typography>
        <ToggleButtonGroup value={scope} exclusive size="small" onChange={handleScopeChange}>
          <ToggleButton value="MY">개인</ToggleButton>
          <ToggleButton value="TEAM">팀</ToggleButton>
        </ToggleButtonGroup>
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
            {scope === 'TEAM' ? '부서 전체' : '전체'} {total}건
          </Typography>

          {total === 0 && (
            <Typography color="text.secondary">집계할 작업이 없습니다.</Typography>
          )}

          <Box sx={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
            {/*
              도넛은 바깥 원(conic-gradient)과 안쪽에 배경색으로 덮은 작은 원,
              이렇게 두 겹으로 만든다 — 링 두께를 border 대신 이 방식으로 주면
              conic-gradient 각도 계산이 안쪽 반지름까지 신경 쓸 필요가 없어 더 단순하다.
            */}
            <Box
              sx={{
                position: 'relative',
                width: 140,
                height: 140,
                borderRadius: '50%',
                background: buildConicGradient(statusCounts, total),
                flexShrink: 0,
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  inset: 22,
                  borderRadius: '50%',
                  bgcolor: 'background.paper',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="h6" fontWeight={700} lineHeight={1.1}>
                  {total}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  건
                </Typography>
              </Box>
            </Box>

          <Box sx={{ display: 'grid', gap: 2, flexGrow: 1, minWidth: 240 }}>
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
                  {/*
                    바깥 Box는 회색 트랙(가로 전체), 안쪽 Box가 실제 막대다.
                    flexGrow와 width%를 한 요소에 같이 주면 flex가 남은 공간을
                    전부 흡수해 모든 막대가 100%로 그려지므로 반드시 분리한다.
                  */}
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
                        height: '100%',
                        display: 'flex',
                        width: `${(p.sum / maxPeriodSum) * 100}%`,
                        minWidth: 4,
                        transition: 'width .3s ease',
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
