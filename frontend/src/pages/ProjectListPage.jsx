import { useCallback, useEffect, useState } from 'react';
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
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

import * as projectApi from '../api/projects';
import { useToast } from '../contexts/ToastContext';
import { PROJECT_STATUS, PROJECT_STATUS_COLOR } from '../utils/constants';
import { formatDate } from '../utils/date';

/**
 * STEP 9 — 내가 속한 프로젝트 목록 + 생성.
 * 생성하면 서버가 나를 자동으로 ADMIN 멤버로 넣어준다.
 */
export default function ProjectListPage() {
  const toast = useToast();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
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
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>
          프로젝트
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
          프로젝트 생성
        </Button>
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

        {projects.map((p) => (
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
