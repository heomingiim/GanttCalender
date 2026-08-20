import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  LinearProgress,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import FolderIcon from '@mui/icons-material/Folder';

import * as projectApi from '../api/projects';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import DateRangePickerField from '../components/DateRangePickerField';
import { PROJECT_STATUS, PROJECT_STATUS_COLOR, VISIBILITY } from '../utils/constants';
import { formatDate } from '../utils/date';
import { pillSearchSx } from '../utils/uiStyles';

const STATUS_ACCENT = {
  PLANNED: '#567C83',
  IN_PROGRESS: '#3AAEA9',
  ON_HOLD: '#f59e0b',
  COMPLETED: '#A2D5AB',
  CANCELLED: '#9e9e9e',
};

export default function ProjectListPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canCreate = user?.role !== 'MEMBER';

  const [projects, setProjects] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', startDate: '', endDate: '', visibility: 'PUBLIC' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await projectApi.listProjects();
      setProjects(Array.isArray(list) ? list : []);
    } catch (err) {
      toast.apiError(err);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const filteredProjects = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return projects.filter((p) => {
      if (q && !p.name?.toLowerCase().includes(q) && !p.description?.toLowerCase().includes(q)) return false;
      if (statusFilter && p.status !== statusFilter) return false;
      if (fromDate && p.endDate && p.endDate < fromDate) return false;
      if (toDate && p.startDate && p.startDate > toDate) return false;
      return true;
    });
  }, [projects, keyword, statusFilter, fromDate, toDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('프로젝트 이름을 입력하세요.'); return; }
    setSaving(true);
    try {
      const created = await projectApi.createProject({
        name: form.name.trim(), description: form.description || null,
        startDate: form.startDate || null, endDate: form.endDate || null,
        status: null, visibility: form.visibility,
      });
      toast.success('프로젝트를 만들었습니다.');
      setOpen(false);
      setForm({ name: '', description: '', startDate: '', endDate: '', visibility: 'PUBLIC' });
      navigate(`/projects/${created.id}`);
    } catch (err) {
      toast.apiError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      {/* 페이지 헤더 */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5">프로젝트</Typography>
          <Typography variant="caption" color="text.secondary">참여 중인 프로젝트 {projects.length}개</Typography>
        </Box>
        <Tooltip title={canCreate ? '' : '팀장급 이상만 프로젝트를 생성할 수 있습니다.'}>
          <span>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)} disabled={!canCreate}>
              프로젝트 생성
            </Button>
          </span>
        </Tooltip>
      </Box>

      {/* 필터 툴바 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', bgcolor: 'background.paper', border: '1px solid #e2e5ea', borderRadius: 2.5, p: 1.5, mb: 2.5, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <TextField size="small" placeholder="이름·설명 검색" value={keyword} onChange={(e) => setKeyword(e.target.value)}
          sx={{ ...pillSearchSx, '& .MuiInputBase-root': { height: 34 } }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }} />
        <TextField select size="small" label="상태" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          sx={{ minWidth: 110, '& .MuiInputBase-root': { height: 34 } }}>
          <MenuItem value="">전체</MenuItem>
          {Object.entries(PROJECT_STATUS).map(([code, label]) => <MenuItem key={code} value={code}>{label}</MenuItem>)}
        </TextField>
        <DateRangePickerField from={fromDate} to={toDate} onChange={(f, t) => { setFromDate(f); setToDate(t); }} placeholder="기간" />
      </Box>

      {/* 프로젝트 카드 그리드 */}
      {projects.length === 0 && <Typography color="text.secondary">참여 중인 프로젝트가 없습니다.</Typography>}
      {projects.length > 0 && filteredProjects.length === 0 && <Typography color="text.secondary">검색 결과가 없습니다.</Typography>}

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' } }}>
        {filteredProjects.map((p) => (
          <Card key={p.id} sx={{ cursor: 'pointer', overflow: 'hidden', '&:hover': { boxShadow: '0 6px 20px rgba(0,0,0,0.11)', transform: 'translateY(-2px)' }, transition: 'all 0.2s' }}>
            <CardActionArea onClick={() => navigate(`/projects/${p.id}`)} sx={{ height: '100%' }}>
              {/* 컬러 상단 바 */}
              <Box sx={{ height: 5, bgcolor: STATUS_ACCENT[p.status] ?? '#567C83' }} />
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1.5 }}>
                  <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: `${STATUS_ACCENT[p.status] ?? '#567C83'}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FolderIcon sx={{ color: STATUS_ACCENT[p.status] ?? '#567C83', fontSize: 20 }} />
                  </Box>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" fontWeight={700} noWrap>{p.name}</Typography>
                    <Chip size="small" color={PROJECT_STATUS_COLOR[p.status]} label={PROJECT_STATUS[p.status] ?? p.status} />
                  </Box>
                </Box>

                <Typography variant="body2" color="text.secondary"
                  sx={{ minHeight: 36, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', mb: 1.5 }}>
                  {p.description || '설명 없음'}
                </Typography>

                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: p.progress != null ? 1 : 0 }}>
                  {formatDate(p.startDate)} ~ {formatDate(p.endDate)}
                </Typography>

                {p.progress != null && (
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">진행률</Typography>
                      <Typography variant="caption" fontWeight={700} color="primary.main">{p.progress}%</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={p.progress}
                      sx={{ borderRadius: 99, height: 5, bgcolor: '#eef0f4', '& .MuiLinearProgress-bar': { borderRadius: 99, background: 'linear-gradient(90deg, #567C83, #3AAEA9)' } }} />
                  </Box>
                )}
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Box>

      {/* 프로젝트 생성 다이얼로그 */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle>프로젝트 생성</DialogTitle>
          <DialogContent dividers sx={{ display: 'grid', gap: 2 }}>
            <TextField label="이름" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required autoFocus size="small" />
            <TextField label="설명" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} multiline minRows={3} size="small" />
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
              <TextField label="시작일" type="date" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} size="small" slotProps={{ inputLabel: { shrink: true } }} />
              <TextField label="종료일" type="date" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} size="small" slotProps={{ inputLabel: { shrink: true } }} />
            </Box>
            <TextField select label="구분" value={form.visibility} onChange={(e) => setForm((p) => ({ ...p, visibility: e.target.value }))} size="small" helperText="이 프로젝트의 단계·하위작업이 그대로 물려받습니다">
              {Object.entries(VISIBILITY).map(([code, label]) => <MenuItem key={code} value={code}>{label}</MenuItem>)}
            </TextField>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>취소</Button>
            <Button type="submit" variant="contained" disabled={saving}>생성</Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
