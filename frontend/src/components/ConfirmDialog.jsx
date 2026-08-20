import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

export default function ConfirmDialog({
  open,
  title = '확인',
  message,
  confirmText = '삭제',
  confirmColor = 'error',
  onConfirm,
  onClose,
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
      <Box sx={{ px: 3, py: 2.5, borderBottom: '1px solid #e2e5ea', bgcolor: '#f8f9fb', display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <WarningAmberIcon sx={{ fontSize: 20, color: 'error.main' }} />
        </Box>
        <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
      </Box>
      <DialogContent sx={{ px: 3, py: 2.5 }}>
        <DialogContentText sx={{ color: 'text.primary', fontSize: '0.9rem' }}>{message}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e2e5ea', bgcolor: '#f8f9fb', gap: 1 }}>
        <Button onClick={onClose} variant="outlined" sx={{ color: 'text.secondary', borderColor: '#d1d5db' }}>취소</Button>
        <Button
          variant="contained"
          color={confirmColor}
          onClick={() => { onConfirm(); onClose(); }}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
