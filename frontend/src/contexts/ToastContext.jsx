import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Alert, Snackbar } from '@mui/material';

// 화면 아무 데서나 toast.success('저장됨') 처럼 부를 수 있게 하는 Context.
// Snackbar 자체는 여기 한 곳에만 렌더링하고, 내용만 state로 갈아끼운다.

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });

  const show = useCallback((message, severity = 'info') => {
    setToast({ open: true, message, severity });
  }, []);

  const success = useCallback((m) => show(m, 'success'), [show]);
  const error = useCallback((m) => show(m, 'error'), [show]);
  const info = useCallback((m) => show(m, 'info'), [show]);

  /**
   * API 에러 객체(client.js가 정규화한 형태)를 그대로 넘기면
   * 서버가 준 한글 message를 띄운다.
   * 단, "아직 구현 안 된 API(notReady)"는 사용자 잘못이 아니므로 조용히 넘긴다.
   */
  const apiError = useCallback(
    (err, fallback = '요청을 처리하지 못했습니다.') => {
      if (err?.notReady) return;
      show(err?.message || fallback, 'error');
    },
    [show]
  );

  const handleClose = (_event, reason) => {
    if (reason === 'clickaway') return; // 딴 데 클릭했다고 바로 닫히면 메시지를 놓친다
    setToast((prev) => ({ ...prev, open: false }));
  };

  // ★ 반드시 useMemo로 감싼다 ★
  // 이걸 빼고 value={{ show, ... }} 로 쓰면 토스트가 뜨고 질 때마다(=이 컴포넌트가
  // 리렌더될 때마다) 새 객체가 만들어진다. 그러면 useToast()를 쓰는 페이지의
  // useCallback(load, [toast])가 매번 새 함수가 되고 → useEffect가 다시 돌아 재조회 →
  // 실패하면 또 토스트 → 무한 루프에 빠진다.
  const value = useMemo(
    () => ({ show, success, error, info, apiError }),
    [show, success, error, info, apiError]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Snackbar
        open={toast.open}
        autoHideDuration={3500}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleClose} severity={toast.severity} variant="filled" sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast는 <ToastProvider> 안에서만 쓸 수 있습니다.');
  return ctx;
}
