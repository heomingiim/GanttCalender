import { createTheme } from '@mui/material/styles';

// MUI 테마. 색/폰트/컴포넌트 기본값을 한 곳에서 정한다.
const theme = createTheme({
  palette: {
    primary: { main: '#2e6f40' },   // 두리안 그린
    secondary: { main: '#f9a825' },
    background: { default: '#f5f6f8' },
  },
  typography: {
    fontFamily:
      '"Pretendard", "Malgun Gothic", "맑은 고딕", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { textTransform: 'none' } },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiTableCell: {
      styleOverrides: { head: { fontWeight: 700, whiteSpace: 'nowrap' } },
    },
  },
});

export default theme;
