import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Collapse,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
} from '@mui/material';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import PeopleIcon from '@mui/icons-material/People';

import { getTree, getUsersByDept } from '../api/departments';
import { searchUsers } from '../api/users';
import { useToast } from '../contexts/ToastContext';
import { USER_ROLE } from '../utils/constants';

const SORT_ACCESSOR = {
  employeeNumber: (u) => u.employeeNumber ?? '',
  name: (u) => u.name ?? '',
  positionRank: (u) => u.positionRank ?? '',
  role: (u) => u.role ?? '',
};

export default function OrgPage() {
  const toast = useToast();

  const [tree, setTree] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null);
  const [users, setUsers] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [sortBy, setSortBy] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(0);
  const rowsPerPage = 10;

  const handleSortClick = (key) => {
    if (sortBy !== key) { setSortBy(key); setSortDir('asc'); }
    else if (sortDir === 'asc') setSortDir('desc');
    else setSortBy(null);
  };

  const filteredUsers = useMemo(() => {
    const filtered = roleFilter ? users.filter((u) => u.role === roleFilter) : users;
    if (!sortBy) return filtered;
    const accessor = SORT_ACCESSOR[sortBy];
    const sign = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = accessor(a); const bv = accessor(b);
      if (av < bv) return -1 * sign;
      if (av > bv) return 1 * sign;
      return 0;
    });
  }, [users, roleFilter, sortBy, sortDir]);

  useEffect(() => {
    getTree().then((data) => setTree(Array.isArray(data) ? data : [])).catch((err) => toast.apiError(err));
  }, [toast]);

  const handleSelectDept = useCallback(async (dept) => {
    setSelectedDept(dept);
    setKeyword('');
    setPage(0);
    try {
      const list = await getUsersByDept(dept.id);
      setUsers(Array.isArray(list) ? list : []);
    } catch (err) {
      toast.apiError(err);
      setUsers([]);
    }
  }, [toast]);

  useEffect(() => {
    const value = keyword.trim();
    if (!value) return;
    let cancelled = false;
    const timerId = setTimeout(() => {
      searchUsers(value).then((list) => {
        if (cancelled) return;
        setUsers(Array.isArray(list) ? list : []);
        setSelectedDept(null);
      }).catch(() => { if (!cancelled) setUsers([]); });
    }, 300);
    return () => { cancelled = true; clearTimeout(timerId); };
  }, [keyword]);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5 }}>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>조직도</Typography>
      </Box>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '260px 1fr' }, alignItems: 'start' }}>
        {/* 부서 트리 */}
        <Card>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, borderBottom: '1px solid #e2e5ea', bgcolor: '#f8f9fb' }}>
            <AccountTreeIcon sx={{ fontSize: 18, color: 'primary.light' }} />
            <Typography variant="subtitle1">부서</Typography>
          </Box>
          <CardContent sx={{ p: 1 }}>
            <List dense disablePadding>
              {tree.map((node) => (
                <DepartmentNode key={node.id} node={node} depth={0} selectedId={selectedDept?.id} onSelect={handleSelectDept} />
              ))}
            </List>
            {tree.length === 0 && (
              <Typography color="text.secondary" sx={{ p: 2, fontSize: '0.84rem' }}>조직 정보가 없습니다.</Typography>
            )}
          </CardContent>
        </Card>

        {/* 사용자 목록 */}
        <Box>
          {/* 검색/필터 */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2, bgcolor: 'background.paper', border: '1px solid #e2e5ea', borderRadius: 2.5, p: 1.5, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <TextField fullWidth size="small" placeholder="이름 또는 사원번호로 전체 검색" value={keyword}
              onChange={(e) => { const next = e.target.value; setKeyword(next); if (!next.trim() && !selectedDept) setUsers([]); }}
              sx={{ '& .MuiInputBase-root': { height: 34 } }}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }} />
            <TextField select size="small" label="직책" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
              sx={{ minWidth: 130, flexShrink: 0, '& .MuiInputBase-root': { height: 34 } }}>
              <MenuItem value="">전체</MenuItem>
              {Object.entries(USER_ROLE).map(([code, label]) => <MenuItem key={code} value={code}>{label}</MenuItem>)}
            </TextField>
          </Box>

          {/* 사용자 테이블 */}
          <Card>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, borderBottom: '1px solid #e2e5ea', bgcolor: '#f8f9fb' }}>
              <PeopleIcon sx={{ fontSize: 18, color: 'primary.light' }} />
              <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                {keyword.trim() ? `검색 결과` : selectedDept ? selectedDept.name : '구성원'}
              </Typography>
              <Chip label={`${filteredUsers.length}명`} size="small" sx={{ bgcolor: '#eef0f4', color: 'text.secondary', fontWeight: 700 }} />
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><TableSortLabel active={sortBy === 'employeeNumber'} direction={sortBy === 'employeeNumber' ? sortDir : 'asc'} onClick={() => handleSortClick('employeeNumber')}>사원번호</TableSortLabel></TableCell>
                    <TableCell><TableSortLabel active={sortBy === 'name'} direction={sortBy === 'name' ? sortDir : 'asc'} onClick={() => handleSortClick('name')}>이름</TableSortLabel></TableCell>
                    <TableCell><TableSortLabel active={sortBy === 'positionRank'} direction={sortBy === 'positionRank' ? sortDir : 'asc'} onClick={() => handleSortClick('positionRank')}>직급</TableSortLabel></TableCell>
                    <TableCell><TableSortLabel active={sortBy === 'role'} direction={sortBy === 'role' ? sortDir : 'asc'} onClick={() => handleSortClick('role')}>직책</TableSortLabel></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                        부서를 선택하거나 검색어를 입력하세요.
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((u) => (
                    <TableRow key={u.id} hover>
                      <TableCell>{u.employeeNumber}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{u.name}</TableCell>
                      <TableCell>{u.positionRank ?? '-'}</TableCell>
                      <TableCell><Chip size="small" label={USER_ROLE[u.role] ?? u.role} variant="outlined" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {filteredUsers.length > rowsPerPage && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 1.5 }}>
                <Pagination count={Math.ceil(filteredUsers.length / rowsPerPage)} page={page + 1} onChange={(_e, p) => setPage(p - 1)} size="small" color="primary" />
              </Box>
            )}
          </Card>
        </Box>
      </Box>
    </Box>
  );
}

function DepartmentNode({ node, depth, selectedId, onSelect }) {
  const [open, setOpen] = useState(depth < 1);
  const children = node.children ?? [];
  const hasChildren = children.length > 0;

  return (
    <>
      <ListItemButton selected={selectedId === node.id} onClick={() => onSelect(node)}
        sx={{ pl: 1 + depth * 2, borderRadius: 1, py: 0.75, '&.Mui-selected': { bgcolor: 'rgba(58,174,169,0.1)', color: 'primary.light' } }}>
        {hasChildren ? (
          <IconButton size="small" sx={{ mr: 0.5 }} onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}>
            {open ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
          </IconButton>
        ) : (
          <Box sx={{ width: 30 }} />
        )}
        <ListItemText primary={node.name} slotProps={{ primary: { fontSize: '0.84rem', fontWeight: depth === 0 ? 700 : 400 } }} />
      </ListItemButton>
      {hasChildren && (
        <Collapse in={open} timeout="auto" unmountOnExit>
          <List dense disablePadding>
            {children.map((child) => (
              <DepartmentNode key={child.id} node={child} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} />
            ))}
          </List>
        </Collapse>
      )}
    </>
  );
}
