import { useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Popover,
  Tooltip,
  Typography,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

import { useNotifications } from '../contexts/NotificationContext';
import { NOTIFICATION_TYPE } from '../utils/constants';
import { formatDateTime } from '../utils/date';

/**
 * 알림 벨.
 * unreadCount는 Context가 5초마다 폴링해서 갱신한다.
 * 목록은 벨을 열 때만 불러온다 (5초마다 전체 목록을 받아올 필요는 없다).
 */
export default function NotificationBell() {
  const { unreadCount, items, available, fetchList, markAsRead, markAllAsRead, remove } =
    useNotifications();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
    fetchList(); // 열 때 1회만 조회
  };

  return (
    <>
      <Tooltip title={available ? '알림' : '알림 API 준비 중'}>
        <span>
          <IconButton onClick={handleOpen}>
            <Badge badgeContent={unreadCount} color="error">
              <NotificationsIcon color={available ? 'inherit' : 'disabled'} />
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
        slotProps={{ paper: { sx: { width: 360, maxHeight: 460 } } }}
      >
        <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center' }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ flexGrow: 1 }}>
            알림
          </Typography>
          {items.length > 0 && (
            <Button size="small" onClick={markAllAsRead}>
              모두 읽음
            </Button>
          )}
        </Box>
        <Divider />

        {!available ? (
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              알림 API(<code>/api/notifications</code>)에 연결하지 못했습니다. 서버가 응답하면
              5초 폴링이 자동으로 다시 시작됩니다.
            </Typography>
          </Box>
        ) : items.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              새 알림이 없습니다.
            </Typography>
          </Box>
        ) : (
          <List dense disablePadding>
            {items.map((n) => (
              <ListItem
                key={n.id}
                disablePadding
                secondaryAction={
                  <IconButton edge="end" size="small" onClick={() => remove(n.id)}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                }
              >
                <ListItemButton
                  onClick={() => !n.read && markAsRead(n.id)}
                  sx={{ bgcolor: n.read ? 'transparent' : 'action.hover' }}
                >
                  <ListItemText
                    primary={n.message}
                    secondary={`${NOTIFICATION_TYPE[n.type] ?? n.type} · ${formatDateTime(n.createdAt)}`}
                    slotProps={{
                      primary: { fontSize: 14, fontWeight: n.read ? 400 : 700 },
                      secondary: { fontSize: 12 },
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Popover>
    </>
  );
}
