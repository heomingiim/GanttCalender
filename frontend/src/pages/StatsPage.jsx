import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Divider,
  LinearProgress,
  MenuItem,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as ReTooltip,
  Legend,
  LabelList,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

import * as statsApi from '../api/stats';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import DateRangePickerField from '../components/DateRangePickerField';
import { STATUS, STATUS_BAR_COLOR } from '../utils/constants';
import { segmentedToggleSx } from '../utils/uiStyles';

const UNITS = [
  { value: 'DAY', label: '일별' },
  { value: 'WEEK', label: '주별' },
  { value: 'MONTH', label: '월별' },
];

function periodLabel(period) {
  const week = period.match(/^\d{4}-W(\d{2})$/);
  if (week) return `${Number(week[1])}주차`;
  const day = period.match(/^\d{4}-(\d{2})-(\d{2})$/);
  if (day) return `${Number(day[1])}/${Number(day[2])}`;
  const month = period.match(/^\d{4}-(\d{2})$/);
  if (month) return `${Number(month[1])}월`;
  return period;
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{ bgcolor: '#fff', border: '1px solid #e2e5ea', borderRadius: 2, p: 1.5, boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}>
      {payload.map((entry) => (
        <Box key={entry.name} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: entry.fill || entry.color }} />
          <Typography variant="caption">{entry.name}: <strong>{entry.value}건</strong></Typography>
        </Box>
      ))}
    </Box>
  );
};

const PieCustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, value, payload: p } = payload[0];
  return (
    <Box sx={{ bgcolor: '#fff', border: '1px solid #e2e5ea', borderRadius: 2, p: 1.5, boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}>
      <Typography variant="caption">{name}: <strong>{value}건 ({p.pct}%)</strong></Typography>
    </Box>
  );
};

export default function StatsPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [unit, setUnit] = useState('MONTH');
  const [scope, setScope] = useState('MY');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [statusCounts, setStatusCounts] = useState({});
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const requestIdRef = useRef(0);
  const skipNextFetchRef = useRef(false);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError('');
    try {
      const data = await statsApi.getPersonalStats({ unit, from: from || undefined, to: to || undefined, scope });
      if (requestId !== requestIdRef.current) return;
      setStatusCounts(data.statusCounts ?? {});
      setRows(data.rows ?? []);
      setTotal(data.total ?? 0);
      if (!from && data.from) { skipNextFetchRef.current = true; setFrom(data.from); }
      if (!to && data.to) { skipNextFetchRef.current = true; setTo(data.to); }
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err.message ?? '통계를 불러오지 못했습니다.');
      setStatusCounts({}); setRows([]); setTotal(0);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [unit, scope, from, to]);

  useEffect(() => {
    if (skipNextFetchRef.current) { skipNextFetchRef.current = false; return; }
    load();
  }, [load]);

  const handleUnitChange = (value) => { setUnit(value); setFrom(''); setTo(''); };
  const handleScopeChange = (_e, next) => {
    if (!next) return;
    if (next === 'TEAM' && !user?.departmentId) { toast.error('소속 부서가 없어 팀 통계를 조회할 수 없습니다.'); return; }
    setScope(next);
  };

  const pieData = useMemo(() =>
    Object.entries(STATUS)
      .map(([code, label]) => ({ name: label, value: statusCounts[code] ?? 0, color: STATUS_BAR_COLOR[code], pct: total > 0 ? Math.round(((statusCounts[code] ?? 0) / total) * 100) : 0 }))
      .filter((d) => d.value > 0),
    [statusCounts, total]
  );

  const periods = useMemo(() => {
    const map = new Map();
    for (const row of rows) {
      if (!map.has(row.period)) map.set(row.period, { period: row.period, label: periodLabel(row.period), _total: 0 });
      const entry = map.get(row.period);
      if (row.status) {
        const key = STATUS[row.status] ?? row.status;
        entry[key] = (entry[key] ?? 0) + row.count;
        entry._total = (entry._total ?? 0) + row.count;
      }
    }
    return [...map.values()];
  }, [rows]);

  const statusKeys = Object.entries(STATUS).filter(([code]) => rows.some((r) => r.status === code));

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5 }}>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>{scope === 'TEAM' ? '팀 통계' : '개인 통계'}</Typography>
      </Box>

      {/* 필터 툴바 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', bgcolor: 'background.paper', border: '1px solid #e2e5ea', borderRadius: 2.5, p: 1.5, mb: 2.5, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <ToggleButtonGroup value={scope} exclusive size="small" onChange={handleScopeChange} sx={segmentedToggleSx}>
          <ToggleButton value="MY">개인</ToggleButton>
          <ToggleButton value="TEAM">팀</ToggleButton>
        </ToggleButtonGroup>
        <TextField select size="small" label="집계 단위" value={unit} onChange={(e) => handleUnitChange(e.target.value)}
          sx={{ minWidth: 110, '& .MuiInputBase-root': { height: 34 } }}>
          {UNITS.map((u) => <MenuItem key={u.value} value={u.value}>{u.label}</MenuItem>)}
        </TextField>
        <DateRangePickerField from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} placeholder="기간" />
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* 상태별 작업 수 */}
      <Card sx={{ mb: 2 }}>
        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #e2e5ea', bgcolor: '#f8f9fb', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle1">상태별 작업 수</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            {scope === 'TEAM' ? '부서 전체' : '전체'} {total}건
          </Typography>
          <Typography sx={{ fontSize: '0.68rem' }} color="text.disabled">(시작일 기준)</Typography>
        </Box>
        <CardContent sx={{ pt: 2.5 }}>
          {total === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>집계할 작업이 없습니다.</Typography>
          ) : (
            <Box sx={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* 도넛 차트 */}
              <Box sx={{ width: 220, height: 220, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <ReTooltip content={<PieCustomTooltip />} />
                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                      <tspan x="50%" dy="-8" fontSize="24" fontWeight="700" fill="#2d3748">{total}</tspan>
                      <tspan x="50%" dy="22" fontSize="12" fill="#8a94a6">건</tspan>
                    </text>
                  </PieChart>
                </ResponsiveContainer>
              </Box>

              {/* 범례 + 수치 */}
              <Box sx={{ flexGrow: 1, minWidth: 200, display: 'grid', gap: 1.5 }}>
                {Object.entries(STATUS).map(([code, label]) => {
                  const count = statusCounts[code] ?? 0;
                  const share = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <Box key={code} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: STATUS_BAR_COLOR[code], flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ width: 55, flexShrink: 0 }}>{label}</Typography>
                      <Box sx={{ flexGrow: 1, height: 8, bgcolor: '#eef0f4', borderRadius: 99, overflow: 'hidden' }}>
                        <Box sx={{ width: `${share}%`, height: '100%', bgcolor: STATUS_BAR_COLOR[code], borderRadius: 99, transition: 'width .4s ease' }} />
                      </Box>
                      <Typography variant="body2" fontWeight={600} sx={{ width: 80, textAlign: 'right', flexShrink: 0 }}>
                        {count}건 <Typography component="span" variant="caption" color="text.secondary">({share}%)</Typography>
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* 구간별 추이 */}
      <Card>
        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #e2e5ea', bgcolor: '#f8f9fb' }}>
          <Typography variant="subtitle1">구간별 추이</Typography>
          <Typography variant="caption" color="text.secondary">구간별 상태 분포 막대 차트</Typography>
        </Box>
        <CardContent>
          {periods.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>표시할 구간이 없습니다.</Typography>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(240, periods.length * 36)}>
              <BarChart data={periods} layout="vertical" margin={{ top: 4, right: 40, left: 40, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e5ea" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#8a94a6' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 12, fill: '#5a6474' }} width={50} axisLine={false} tickLine={false} />
                <ReTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />
                {statusKeys.map(([code, label], idx) => (
                  <Bar
                    key={code}
                    dataKey={label}
                    stackId="a"
                    fill={STATUS_BAR_COLOR[code]}
                    radius={idx === statusKeys.length - 1 ? [0, 4, 4, 0] : [0, 0, 0, 0]}
                    maxBarSize={28}
                  >
                    {idx === statusKeys.length - 1 && (
                      <LabelList
                        dataKey="_total"
                        position="right"
                        formatter={(v) => v > 0 ? `${v}건` : ''}
                        style={{ fontSize: 11, fill: '#5a6474' }}
                      />
                    )}
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
