import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded';
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

const SIDEBAR_W = 60;
const MOBILE_DRAWER_W = 220;

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
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const currentItem = NAV_ITEMS.find((item) =>
    item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
  );

  const handleLogout = async () => {
    setAnchorEl(null);
    await logout();
    navigate('/login', { replace: true });
  };

  // 데스크톱: 아이콘만 있는 60px 사이드바
  const desktopSidebar = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', py: 1.5 }}>
      {/* 로고 */}
      <Tooltip title="두리안 GROUPWARE" placement="right">
        <Box
          onClick={() => navigate('/')}
          sx={{
            width: 38, height: 38,
            background: 'linear-gradient(135deg, #425F65 0%, #3AAEA9 100%)',
            borderRadius: 2,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(86,124,131,0.35)',
            cursor: 'pointer',
            mb: 2.5, flexShrink: 0,
          }}
        >
          <GridViewRoundedIcon sx={{ color: '#fff', fontSize: 21 }} />
        </Box>
      </Tooltip>

      <Divider sx={{ width: 36, mb: 1.5 }} />

      {/* 네비게이션 아이콘 */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 0.5, width: '100%' }}>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            style={{ textDecoration: 'none', color: 'inherit' }}
            onClick={() => setMobileOpen(false)}
          >
            {({ isActive }) => (
              <Tooltip title={item.label} placement="right" arrow>
                <Box sx={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', py: 0.25 }}>
                  {isActive && (
                    <Box sx={{
                      position: 'absolute', left: 0, top: '12%', bottom: '12%',
                      width: 3, borderRadius: '0 3px 3px 0',
                      bgcolor: 'primary.light',
                    }} />
                  )}
                  <Box
                    sx={{
                      width: 42, height: 42, borderRadius: 2,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      bgcolor: isActive ? 'rgba(58,174,169,0.13)' : 'transparent',
                      color: isActive ? 'primary.light' : 'text.secondary',
                      transition: 'all 0.15s',
                      '&:hover': { bgcolor: isActive ? 'rgba(58,174,169,0.2)' : 'action.hover', color: isActive ? 'primary.light' : 'text.primary' },
                      '& .MuiSvgIcon-root': { fontSize: 21 },
                    }}
                  >
                    {item.icon}
                  </Box>
                </Box>
              </Tooltip>
            )}
          </NavLink>
        ))}
      </Box>

      <Divider sx={{ width: 36, mt: 1 }} />

      {/* 하단 유저 아바타 */}
      <Tooltip title={`${user?.name ?? ''} · ${USER_ROLE[user?.role] ?? user?.role ?? ''}`} placement="right" arrow>
        <Avatar
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{
            width: 34, height: 34, mt: 1.5, mb: 0.5,
            bgcolor: 'primary.main', fontSize: 13,
            cursor: 'pointer',
            '&:hover': { bgcolor: 'primary.dark' },
            transition: 'background-color 0.15s',
          }}
        >
          {user?.name?.charAt(0) ?? '?'}
        </Avatar>
      </Tooltip>
    </Box>
  );

  // 모바일: 텍스트 포함 드로어
  const mobileSidebar = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }} onClick={() => navigate('/')}>
          <Box sx={{
            width: 34, height: 34,
            background: 'linear-gradient(135deg, #425F65 0%, #3AAEA9 100%)',
            borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <GridViewRoundedIcon sx={{ color: '#fff', fontSize: 18 }} />
          </Box>
          <Box sx={{ lineHeight: 1 }}>
            <Typography variant="subtitle1" fontWeight={800} color="primary.dark" sx={{ lineHeight: 1, fontSize: 16 }}>두리안</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>GROUPWARE</Typography>
          </Box>
        </Box>
      </Toolbar>
      <Divider />
      <Box sx={{ flexGrow: 1, py: 1 }}>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            style={{ textDecoration: 'none', color: 'inherit' }}
            onClick={() => setMobileOpen(false)}
          >
            {({ isActive }) => (
              <Box sx={{
                display: 'flex', alignItems: 'center', gap: 1.5,
                px: 2, py: 1.25,
                bgcolor: isActive ? 'rgba(58,174,169,0.1)' : 'transparent',
                color: isActive ? 'primary.light' : 'text.primary',
                borderLeft: isActive ? '3px solid' : '3px solid transparent',
                borderColor: isActive ? 'primary.light' : 'transparent',
                '&:hover': { bgcolor: 'action.hover' },
                '& .MuiSvgIcon-root': { fontSize: 20 },
              }}>
                {item.icon}
                <Typography sx={{ fontSize: 13, fontWeight: isActive ? 700 : 400 }}>{item.label}</Typography>
              </Box>
            )}
          </NavLink>
        ))}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100%', bgcolor: '#f5f6f8' }}>

      {/* 모바일 드로어 */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: MOBILE_DRAWER_W, boxSizing: 'border-box' },
        }}
      >
        {mobileSidebar}
      </Drawer>

      {/* 데스크톱 고정 사이드바 */}
      <Box component="nav" sx={{ width: { md: SIDEBAR_W }, flexShrink: { md: 0 }, display: { xs: 'none', md: 'block' } }}>
        <Drawer
          variant="permanent"
          open
          sx={{
            '& .MuiDrawer-paper': {
              width: SIDEBAR_W,
              boxSizing: 'border-box',
              borderRight: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              overflow: 'hidden',
            },
          }}
        >
          {desktopSidebar}
        </Drawer>
      </Box>

      {/* 상단 AppBar */}
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          left: { md: `${SIDEBAR_W}px` },
          width: { md: `calc(100% - ${SIDEBAR_W}px)` },
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Toolbar sx={{ gap: 1, minHeight: { md: 56 } }}>
          <IconButton
            edge="start"
            onClick={() => setMobileOpen((v) => !v)}
            sx={{ mr: 1, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="subtitle1" fontWeight={700} sx={{ flexGrow: 1, fontSize: 15, color: 'text.primary' }}>
            {currentItem?.label ?? '두리안'}
          </Typography>

          <NotificationBell />

          <Tooltip title={user?.name ?? ''} arrow>
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ ml: 0.5, p: 0.5 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 13 }}>
                {user?.name?.charAt(0) ?? '?'}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* 유저 드롭다운 메뉴 */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{ paper: { sx: { mt: 0.5, minWidth: 200 } } }}
      >
        <MenuItem disabled sx={{ opacity: '1 !important', pb: 1 }}>
          <Box>
            <Typography variant="body2" fontWeight={700}>
              {user?.name}
              {user?.role ? ` · ${USER_ROLE[user.role] ?? user.role}` : ''}
            </Typography>
            {user?.positionRank && (
              <Typography variant="caption" color="text.secondary" component="div">
                {user.positionRank}{user?.departmentName ? ` · ${user.departmentName}` : ''}
              </Typography>
            )}
            {user?.employeeNumber && (
              <Typography variant="caption" color="text.secondary" component="div">
                {user.employeeNumber}
              </Typography>
            )}
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

      {/* 메인 콘텐츠 */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.default',
        }}
      >
        <Toolbar sx={{ minHeight: { md: 56 }, flexShrink: 0 }} />
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: { xs: 2, md: 3 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
