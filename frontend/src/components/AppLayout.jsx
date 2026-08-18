import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ChecklistIcon from '@mui/icons-material/Checklist';
import FolderIcon from '@mui/icons-material/Folder';
import LabelIcon from '@mui/icons-material/Label';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import BarChartIcon from '@mui/icons-material/BarChart';
import MenuIcon from '@mui/icons-material/Menu';

import { useAuth } from '../contexts/AuthContext';
import NotificationBell from './NotificationBell';
import { USER_ROLE } from '../utils/constants';

const DRAWER_WIDTH = 220;

const NAV_ITEMS = [
  { to: '/', label: '대시보드', icon: <DashboardIcon /> },
  { to: '/calendar', label: '캘린더', icon: <CalendarMonthIcon /> },
  { to: '/todos', label: '투두리스트', icon: <ChecklistIcon /> },
  { to: '/projects', label: '프로젝트', icon: <FolderIcon /> },
  { to: '/categories', label: '카테고리', icon: <LabelIcon /> },
  { to: '/org', label: '조직도', icon: <AccountTreeIcon /> },
  { to: '/stats', label: '통계', icon: <BarChartIcon /> },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null); // 프로필 메뉴가 붙을 DOM 요소

  const handleLogout = async () => {
    setAnchorEl(null);
    await logout();
    navigate('/login', { replace: true });
  };

  // NavLink는 현재 경로와 일치하면 isActive=true를 넘겨준다.
  // end 옵션이 없으면 '/'가 모든 경로에 매칭되어 항상 활성화된다.
  // 사이드바 전체를 세로 flex로 두고 nav List만 flexGrow시켜서,
  // 아래쪽 사용자 정보 블록이 항상 바닥에 붙어 있게 만든다.
  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar>
        <Typography variant="h6" color="primary" noWrap>
          두리안 그룹웨어
        </Typography>
      </Toolbar>
      <Divider />
      <List sx={{ flexGrow: 1 }}>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            style={{ textDecoration: 'none', color: 'inherit' }}
            onClick={() => setMobileOpen(false)}
          >
            {({ isActive }) => (
              <ListItemButton
                selected={isActive}
                sx={{
                  '&.Mui-selected': {
                    bgcolor: 'rgba(58, 174, 169, 0.12)',
                    '&:hover': { bgcolor: 'rgba(58, 174, 169, 0.18)' },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: isActive ? 'primary.main' : undefined }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  slotProps={{
                    primary: { fontWeight: isActive ? 700 : 400 },
                  }}
                />
              </ListItemButton>
            )}
          </NavLink>
        ))}
      </List>

      <Divider />
      {/*
        ListItemButton은 MUI가 내부적으로 최소 높이·패딩 클래스를 갖고 있어서
        sx로 py를 줄여도 위아래 여백이 잘 안 줄었다. 그래서 여기만 일반 Box +
        onClick으로 바꿔서 패딩을 코드에 쓴 값 그대로 확실하게 반영시킨다.
      */}
      <Box
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
          py: '10px',
          cursor: 'pointer',
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14, flexShrink: 0 }}>
          {user?.name?.charAt(0) ?? '?'}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography noWrap sx={{ fontSize: 12, fontWeight: 700, lineHeight: 1.4 }}>
            {user?.name}
            {user?.role ? ` · ${USER_ROLE[user.role] ?? user.role}` : ''}
          </Typography>
          <Typography color="text.secondary" noWrap sx={{ fontSize: 10, lineHeight: 1.4, display: 'block' }}>
            {user?.positionRank ? `${user.positionRank} · ` : ''}
            {user?.departmentName ?? '부서 없음'}
          </Typography>
          <Typography color="text.secondary" noWrap sx={{ fontSize: 10, lineHeight: 1.4, display: 'block' }}>
            {user?.employeeNumber}
          </Typography>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            onClick={() => setMobileOpen((v) => !v)}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ flexGrow: 1 }} />

          <NotificationBell />

          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ ml: 1 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}>
              {user?.name?.charAt(0) ?? '?'}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
          >
            <MenuItem disabled sx={{ opacity: '1 !important' }}>
              <Box>
                <Typography variant="body2" fontWeight={700}>
                  {user?.name} ({USER_ROLE[user?.role] ?? user?.role})
                  {user?.positionRank ? ` · ${user.positionRank}` : ''}
                </Typography>
                <Typography variant="caption" color="text.secondary" component="div">
                  {user?.departmentName ?? '부서 없음'} · {user?.employeeNumber}
                </Typography>
                {user?.email && (
                  <Typography variant="caption" color="text.secondary" component="div">
                    {user.email}
                  </Typography>
                )}
              </Box>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>로그아웃</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* 모바일: 임시 Drawer / 데스크톱: 고정 Drawer */}
      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
          }}
        >
          {drawerContent}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          bgcolor: 'background.default',
          minHeight: '100vh',
        }}
      >
        <Toolbar /> {/* 고정 AppBar 높이만큼 밀어내는 스페이서 */}
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          {/* 자식 라우트가 여기에 그려진다 */}
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
