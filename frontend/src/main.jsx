import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

import App from './App';
import theme from './theme';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { NotificationProvider } from './contexts/NotificationContext';
import './index.css';

// ─────────────────────────────────────────────────────────────
// 앱의 진입점. Provider를 감싸는 순서에 의미가 있다.
//   ThemeProvider  ─ MUI 스타일
//     ToastProvider ─ 아무 데서나 토스트를 띄우려면 바깥쪽에 있어야 한다
//       AuthProvider ─ 로그인 상태
//         NotificationProvider ─ useAuth()를 쓰므로 AuthProvider 안쪽이어야 한다
//           HashRouter ─ 라우팅
//
// HashRouter를 쓰는 이유: 배포 시 Vite 빌드 결과를 Spring이 정적 파일로 서빙하는데,
// BrowserRouter라면 /calendar 로 새로고침할 때 Spring이 그 경로를 몰라 404를 낸다.
// 해시(/#/calendar)는 서버로 전송되지 않아서 백엔드 수정 없이 SPA 라우팅이 된다.
// ─────────────────────────────────────────────────────────────
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ToastProvider>
          <AuthProvider>
            <NotificationProvider>
              <HashRouter>
                <App />
              </HashRouter>
            </NotificationProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </LocalizationProvider>
  </React.StrictMode>
);
