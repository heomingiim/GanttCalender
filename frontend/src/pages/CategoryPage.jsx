import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LabelIcon from '@mui/icons-material/Label';

import * as categoryApi from '../api/categories';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import ConfirmDialog from '../components/ConfirmDialog';
import { isTeamLeadOrAbove } from '../utils/constants';

const DEFAULT_COLOR = '#2e6f40';

export default function CategoryPage() {
  const toast = useToast();
  const { user } = useAuth();
  const canManageTeam = isTeamLeadOrAbove(user?.role);

  const [categories, setCategories] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', color: DEFAULT_COLOR, isTeam: false });
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    try {
      const list = await categoryApi.listCategories();
      setCategories(Array.isArray(list) ? list : []);
    } catch (err) {
      toast.apiError(err);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', color: DEFAULT_COLOR, isTeam: false });
    setDialogOpen(true);
  };

  const openEdit = (category) => {
    setEditing(category);
    setForm({ name: category.name, color: category.color || DEFAULT_COLOR, isTeam: category.team });
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('이름을 입력하세요.'); return; }
    const body = { name: form.name.trim(), color: form.color, isTeam: form.isTeam };
    try {
      if (editing) {
        await categoryApi.updateCategory(editing.id, body);
        toast.success('수정했습니다.');
      } else {
        await categoryApi.createCategory(body);
        toast.success('추가했습니다.');
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      toast.apiError(err);
    }
  };

  const handleDelete = async () => {
    try {
      await categoryApi.deleteCategory(deleteTarget.id);
      toast.success('삭제했습니다.');
      load();
    } catch (err) {
      toast.apiError(err);
    }
  };

  const personalCategories = categories.filter((c) => !c.team);
  const teamCategories = categories.filter((c) => c.team);

  const CategoryCard = ({ c }) => {
    const locked = c.team && !canManageTeam;
    return (
      <Card sx={{ '&:hover': { boxShadow: '0 4px 14px rgba(0,0,0,0.1)' }, transition: 'box-shadow 0.2s' }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: '14px 16px !important' }}>
          <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: c.color || DEFAULT_COLOR, flexShrink: 0, boxShadow: `0 0 0 3px ${c.color || DEFAULT_COLOR}22` }} />
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography fontWeight={600} noWrap sx={{ fontSize: '0.88rem' }}>{c.name}</Typography>
            <Typography variant="caption" color="text.disabled">{c.color || '색상 없음'}</Typography>
          </Box>
          {c.team && <Chip size="small" label="팀 공용" color="primary" variant="outlined" />}
          <Box sx={{ display: 'flex', gap: 0.25, flexShrink: 0 }}>
            <Tooltip title={locked ? '팀장급 이상만 관리할 수 있습니다' : '수정'}>
              <span>
                <IconButton size="small" onClick={() => openEdit(c)} disabled={locked}><EditIcon fontSize="small" /></IconButton>
              </span>
            </Tooltip>
            <IconButton size="small" onClick={() => setDeleteTarget(c)} disabled={locked}><DeleteIcon fontSize="small" /></IconButton>
          </Box>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5">카테고리</Typography>
          <Typography variant="caption" color="text.secondary">전체 {categories.length}개</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>카테고리 추가</Button>
      </Box>

      {categories.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <LabelIcon sx={{ fontSize: 40, opacity: 0.2, mb: 1 }} />
          <Typography>등록된 카테고리가 없습니다.</Typography>
        </Box>
      )}

      {personalCategories.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <LabelIcon sx={{ fontSize: 15 }} /> 개인 카테고리
          </Typography>
          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' } }}>
            {personalCategories.map((c) => <CategoryCard key={c.id} c={c} />)}
          </Box>
        </Box>
      )}

      {teamCategories.length > 0 && (
        <Box>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <LabelIcon sx={{ fontSize: 15 }} /> 팀 공용 카테고리
          </Typography>
          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' } }}>
            {teamCategories.map((c) => <CategoryCard key={c.id} c={c} />)}
          </Box>
        </Box>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle>{editing ? '카테고리 수정' : '카테고리 추가'}</DialogTitle>
          <DialogContent dividers sx={{ display: 'grid', gap: 2 }}>
            <TextField label="이름" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} autoFocus required size="small" />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <TextField label="색상" type="color" value={form.color} onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))} size="small" slotProps={{ inputLabel: { shrink: true } }} sx={{ flexGrow: 1 }} />
              <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: form.color, border: '1px solid #e2e5ea', flexShrink: 0 }} />
            </Box>
            <Tooltip title={canManageTeam ? '' : '팀장급 이상만 팀 공용 카테고리를 만들 수 있습니다'}>
              <FormControlLabel
                control={<Switch checked={form.isTeam} onChange={(e) => setForm((p) => ({ ...p, isTeam: e.target.checked }))} disabled={!canManageTeam || Boolean(editing)} />}
                label="팀 공용 카테고리"
              />
            </Tooltip>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>취소</Button>
            <Button type="submit" variant="contained">저장</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <ConfirmDialog open={deleteTarget != null} message={`'${deleteTarget?.name}' 카테고리를 삭제할까요?`} onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />
    </Box>
  );
}
