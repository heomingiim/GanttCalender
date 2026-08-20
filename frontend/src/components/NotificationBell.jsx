import { useState } from 'react';
import {
  Badge,
  Box,
  Divider,
  IconButton,
  ListItemButton,
  Popover,
  Tooltip,
  Typography,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DoneAllIcon from '@mui/icons-material/DoneAll';

import { useNotifications } from '../contexts/NotificationContext';
import { NOTIFICATION_TYPE } from '../utils/constants';
import { formatDateTime } from '../utils/date';

export default function NotificationBell() {
  const { unreadCount, items, available, fetchList, markAsRead, markAllAsRead, remove, removeAll } =
    useNotifications();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
    fetchList();
  };

  return (
    <>
      <Tooltip title={available ? '알림' : '알림 API 준비 중'}>
        <span>
          <IconButton onClick={handleOpen} size="small" sx={{ color: 'inherit' }}>
            <Badge badgeContent={unreadCount} color="error" sx={{ '& .MuiBadge-badge': { fontSize: '0.65rem', minWidth: 16, height: 16 } }}>
              {unreadCount > 0
                ? <NotificationsIcon sx={{ fontSize: 22 }} color={available ? 'inherit' : 'disabled'} />
                : <NotificationsNoneIcon sx={{ fontSize: 22 }} color={available ? 'inherit' : 'disabled'} />}
            </Badge>
          </IconButton>
        </span>
      </Tooltip>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              width: 360,
              maxHeight: 480,
              borderRadius: 2.5,
              border: '1px solid #e2e5ea',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              overflow: 'hidden',
            },
          },
        }}
      >
        {/* 헤더 */}
        <Box sx={{ px: 2.5, py: 1.75, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid #e2e5ea', bgcolor: '#f8f9fb' }}>
          <NotificationsIcon sx={{ fontSize: 18, color: 'primary.light' }} />
          <Typography variant="subtitle2" fontWeight={700} sx={{ flexGrow: 1 }}>알림</Typography>
          {unreadCount > 0 && (
            <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: 'error.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography sx={{ color: '#fff', fontSize: '0.65rem', fontWeight: 700 }}>{unreadCount}</Typography>
            </Box>
          )}
          {items.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title="모두 읽음">
                <IconButton size="small" onClick={markAllAsRead} sx={{ color: 'primary.light' }}>
                  <DoneAllIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="모두 삭제">
                <IconButton size="small" onClick={removeAll} sx={{ color: 'error.light' }}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>

        {!available ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <NotificationsNoneIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              알림 서버에 연결하지 못했습니다.
            </Typography>
            <Typography variant="caption" color="text.disabled">
              1분마다 재시도합니다.
            </Typography>
          </Box>
        ) : items.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <NotificationsNoneIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1.5, display: 'block', mx: 'auto' }} />
            <Typography variant="body2" color="text.secondary">새 알림이 없습니다.</Typography>
          </Box>
        ) : (
          <Box sx={{ overflowY: 'auto', maxHeight: 400 }}>
            {items.map((n, idx) => (
              <Box key={n.id}>
                <Box sx={{ display: 'flex', alignItems: 'stretch' }}>
                  {/* 읽지 않은 알림 파란 세로선 */}
                  <Box sx={{ width: 3, flexShrink: 0, bgcolor: n.read ? 'transparent' : 'primary.light', borderRadius: '0 2px 2px 0' }} />
                  <ListItemButton
                    onClick={() => !n.read && markAsRead(n.id)}
                    sx={{ px: 2, py: 1.5, bgcolor: n.read ? 'transparent' : 'rgba(58,174,169,0.04)', flexGrow: 1 }}
                  >
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        fontWeight={n.read ? 400 : 700}
                        sx={{ mb: 0.25, wordBreak: 'break-word' }}
                      >
                        {n.message}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {NOTIFICATION_TYPE[n.type] ?? n.type} · {formatDateTime(n.createdAt)}
                      </Typography>
                    </Box>
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={(e) => { e.stopPropagation(); remove(n.id); }}
                      sx={{ ml: 1, flexShrink: 0, color: 'text.disabled', '&:hover': { color: 'error.main' } }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </ListItemButton>
                </Box>
                {idx < items.length - 1 && <Divider />}
              </Box>
            ))}
          </Box>
        )}
      </Popover>
    </>
  );
}
