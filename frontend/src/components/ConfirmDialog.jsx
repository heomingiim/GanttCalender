import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';

/**
 * 삭제 등 되돌릴 수 없는 동작 전 확인창.
 *
 * window.confirm()을 쓰지 않는 이유: 브라우저 기본 창은 스타일을 못 바꾸고
 * 실행이 동기적으로 멈춰서 React 렌더링 흐름과 어긋난다.
 */
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
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>취소</Button>
        <Button
          variant="contained"
          color={confirmColor}
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
