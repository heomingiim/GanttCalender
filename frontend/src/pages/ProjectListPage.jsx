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
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';

import * as projectApi from '../api/projects';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import DateRangePickerField from '../components/DateRangePickerField';
import { PROJECT_STATUS, PROJECT_STATUS_COLOR } from '../utils/constants';
import { formatDate } from '../utils/date';
import { pillSearchSx } from '../utils/uiStyles';

/**
 * 내가 속한 프로젝트 목록 + 생성.
 * 생성하면 서버가 나를 자동으로 ADMIN 멤버로 넣어준다.
 */
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
  const [form, setForm] = useState({ name: '', description: '', startDate: '', endDate: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await projectApi.listProjects();
      setProjects(Array.isArray(list) ? list : []);
    } catch (err) {
      toast.apiError(err);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredProjects = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return projects.filter((p) => {
      if (q && !p.name?.toLowerCase().includes(q) && !p.description?.toLowerCase().includes(q)) {
        return false;
      }
      if (statusFilter && p.status !== statusFilter) {
        return false;
      }
      if (fromDate && p.endDate && p.endDate < fromDate) {
        return false;
      }
      if (toDate && p.startDate && p.startDate > toDate) {
        return false;
      }
      return true;
    });
  }, [projects, keyword, statusFilter, fromDate, toDate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.error('프로젝트 이름을 입력하세요.');
      return;
    }

    setSaving(true);
    try {
      // startDate/endDate는 LocalDate라서 'YYYY-MM-DD' 그대로 보낸다 (시간 없음)
      const created = await projectApi.createProject({
        name: form.name.trim(),
        description: form.description || null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        status: null, // 생성 시 서버가 PLANNED로 고정
      });
      toast.success('프로젝트를 만들었습니다.');
      setOpen(false);
      setForm({ name: '', description: '', startDate: '', endDate: '' });
      navigate(`/projects/${created.id}`);
    } catch (err) {
      toast.apiError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>
          프로젝트
        </Typography>
        <TextField
          size="small"
          placeholder="이름·설명 검색"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          sx={pillSearchSx}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <TextField
          select
          size="small"
          label="상태"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{ minWidth: 110, '& .MuiInputBase-root': { height: 40 } }}
        >
          <MenuItem value="">전체</MenuItem>
          {Object.entries(PROJECT_STATUS).map(([code, label]) => (
            <MenuItem key={code} value={code}>
              {label}
            </MenuItem>
          ))}
        </TextField>
        <DateRangePickerField
          from={fromDate}
          to={toDate}
          onChange={(f, t) => {
            setFromDate(f);
            setToDate(t);
          }}
          placeholder="기간"
        />
        <Tooltip title={canCreate ? '' : '팀장급 이상만 프로젝트를 생성할 수 있습니다.'}>
          <span>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpen(true)}
              disabled={!canCreate}
            >
              프로젝트 생성
            </Button>
          </span>
        </Tooltip>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' },
        }}
      >
        {projects.length === 0 && (
          <Typography color="text.secondary">
            참여 중인 프로젝트가 없습니다. 새로 만들어 보세요.
          </Typography>
        )}
        {projects.length > 0 && filteredProjects.length === 0 && (
          <Typography color="text.secondary">검색 결과가 없습니다.</Typography>
        )}

        {filteredProjects.map((p) => (
          <Card key={p.id} variant="outlined">
            <CardActionArea onClick={() => navigate(`/projects/${p.id}`)}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'start', gap: 1, mb: 1 }}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ flexGrow: 1 }}>
                    {p.name}
                  </Typography>
                  <Chip
                    size="small"
                    color={PROJECT_STATUS_COLOR[p.status]}
                    label={PROJECT_STATUS[p.status] ?? p.status}
                  />
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    minHeight: 40,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {p.description || '설명 없음'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatDate(p.startDate)} ~ {formatDate(p.endDate)}
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle>프로젝트 생성</DialogTitle>
          <DialogContent dividers sx={{ display: 'grid', gap: 2 }}>
            <TextField
              label="이름"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              required
              autoFocus
              size="small"
            />
            <TextField
              label="설명"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              multiline
              minRows={3}
              size="small"
            />
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
              <TextField
                label="시작일"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="종료일"
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>취소</Button>
            <Button type="submit" variant="contained" disabled={saving}>
              생성
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
