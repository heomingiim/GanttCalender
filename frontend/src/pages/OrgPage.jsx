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
  Paper,
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

import { getTree, getUsersByDept } from '../api/departments';
import { searchUsers } from '../api/users';
import { useToast } from '../contexts/ToastContext';
import { USER_ROLE } from '../utils/constants';

/**
 * 조직도 + 사용자 검색.
 *
 * 볼 만한 부분: DepartmentNode가 자기 자신을 다시 렌더링하는 재귀 컴포넌트라는 점.
 * 서버가 children이 중첩된 트리를 주므로, 깊이를 몰라도 재귀로 전부 그릴 수 있다.
 */
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

  const handleSortClick = (key) => {
    if (sortBy !== key) {
      setSortBy(key);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else {
      setSortBy(null);
    }
  };

  const filteredUsers = useMemo(() => {
    const filtered = roleFilter ? users.filter((u) => u.role === roleFilter) : users;
    if (!sortBy) return filtered;
    const accessor = SORT_ACCESSOR[sortBy];
    const sign = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      if (av < bv) return -1 * sign;
      if (av > bv) return 1 * sign;
      return 0;
    });
  }, [users, roleFilter, sortBy, sortDir]);

  useEffect(() => {
    getTree()
      .then((data) => setTree(Array.isArray(data) ? data : []))
      .catch((err) => toast.apiError(err));
  }, [toast]);

  // 부서를 고르면 그 부서 사용자 목록을 불러온다
  const handleSelectDept = useCallback(
    async (dept) => {
      setSelectedDept(dept);
      setKeyword('');
      try {
        const list = await getUsersByDept(dept.id);
        setUsers(Array.isArray(list) ? list : []);
      } catch (err) {
        toast.apiError(err);
        setUsers([]);
      }
    },
    [toast]
  );

  // 검색어 입력 → 디바운스 후 전체 사용자 검색 (부서 선택과 무관하게 동작)
  useEffect(() => {
    const value = keyword.trim();
    if (!value) return;

    // 타이머만 지우면 "이미 날아간" 요청은 못 막는다.
    // 300ms가 지나 요청이 출발한 뒤 검색어를 지우면, 늦게 도착한 응답이
    // 비워둔 표를 다시 채운다. cancelled 플래그로 그 응답을 버린다.
    let cancelled = false;

    const timerId = setTimeout(() => {
      searchUsers(value)
        .then((list) => {
          if (cancelled) return;
          setUsers(Array.isArray(list) ? list : []);
          setSelectedDept(null);
        })
        .catch(() => {
          if (!cancelled) setUsers([]);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
  }, [keyword]);

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        조직도
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', md: '320px 1fr' },
          alignItems: 'start',
        }}
      >
        <Card variant="outlined">
          <CardContent sx={{ p: 1 }}>
            <List dense disablePadding>
              {tree.map((node) => (
                <DepartmentNode
                  key={node.id}
                  node={node}
                  depth={0}
                  selectedId={selectedDept?.id}
                  onSelect={handleSelectDept}
                />
              ))}
            </List>
            {tree.length === 0 && (
              <Typography color="text.secondary" sx={{ p: 2 }}>
                조직 정보가 없습니다.
              </Typography>
            )}
          </CardContent>
        </Card>

        <Box>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="이름 또는 사원번호로 전체 검색"
              value={keyword}
              onChange={(e) => {
                const next = e.target.value;
                setKeyword(next);
                // 검색어를 지우면 이전 검색 결과도 함께 치운다.
                // (부서 선택 시의 초기화는 handleSelectDept가 따로 처리한다)
                if (!next.trim() && !selectedDept) setUsers([]);
              }}
              sx={{ bgcolor: 'background.paper' }}
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
              label="직책"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              sx={{ minWidth: 140, flexShrink: 0, '& .MuiInputBase-root': { height: 40 } }}
            >
              <MenuItem value="">전체</MenuItem>
              {Object.entries(USER_ROLE).map(([code, label]) => (
                <MenuItem key={code} value={code}>{label}</MenuItem>
              ))}
            </TextField>
          </Box>

          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            {keyword.trim()
              ? `검색 결과 ${filteredUsers.length}명`
              : selectedDept
                ? `${selectedDept.name} · ${filteredUsers.length}명`
                : '부서를 선택하거나 검색어를 입력하세요.'}
          </Typography>

          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === 'employeeNumber'}
                      direction={sortBy === 'employeeNumber' ? sortDir : 'asc'}
                      onClick={() => handleSortClick('employeeNumber')}
                    >
                      사원번호
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === 'name'}
                      direction={sortBy === 'name' ? sortDir : 'asc'}
                      onClick={() => handleSortClick('name')}
                    >
                      이름
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === 'positionRank'}
                      direction={sortBy === 'positionRank' ? sortDir : 'asc'}
                      onClick={() => handleSortClick('positionRank')}
                    >
                      직급
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === 'role'}
                      direction={sortBy === 'role' ? sortDir : 'asc'}
                      onClick={() => handleSortClick('role')}
                    >
                      직책
                    </TableSortLabel>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      표시할 사용자가 없습니다.
                    </TableCell>
                  </TableRow>
                )}
                {filteredUsers.map((u) => (
                  <TableRow key={u.id} hover>
                    <TableCell>{u.employeeNumber}</TableCell>
                    <TableCell>{u.name}</TableCell>
                    <TableCell>{u.positionRank ?? '-'}</TableCell>
                    <TableCell>
                      <Chip size="small" label={USER_ROLE[u.role] ?? u.role} variant="outlined" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Box>
    </Box>
  );
}

/**
 * ★ 재귀 컴포넌트 ★
 * 자기 안에서 <DepartmentNode>를 다시 렌더링한다.
 * depth는 들여쓰기용 숫자이고, 자식에게는 depth+1을 넘긴다.
 * 펼침 여부(open)는 각 노드가 자기 state로 들고 있으므로 형제끼리 영향을 주지 않는다.
 */
function DepartmentNode({ node, depth, selectedId, onSelect }) {
  const [open, setOpen] = useState(depth < 1); // 최상위만 기본으로 펼침
  const children = node.children ?? [];
  const hasChildren = children.length > 0;

  return (
    <>
      <ListItemButton
        selected={selectedId === node.id}
        onClick={() => onSelect(node)}
        sx={{ pl: 1 + depth * 2, borderRadius: 1 }}
      >
        {hasChildren ? (
          <IconButton
            size="small"
            sx={{ mr: 0.5 }}
            onClick={(e) => {
              e.stopPropagation(); // 이게 없으면 펼치기 버튼을 눌러도 부서 선택까지 같이 실행된다
              setOpen((v) => !v);
            }}
          >
            {open ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
          </IconButton>
        ) : (
          <Box sx={{ width: 30 }} />
        )}
        <ListItemText
          primary={node.name}
          slotProps={{ primary: { fontSize: 14, fontWeight: depth === 0 ? 700 : 400 } }}
        />
      </ListItemButton>

      {hasChildren && (
        <Collapse in={open} timeout="auto" unmountOnExit>
          <List dense disablePadding>
            {children.map((child) => (
              <DepartmentNode
                key={child.id}
                node={child}
                depth={depth + 1}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            ))}
          </List>
        </Collapse>
      )}
    </>
  );
}
