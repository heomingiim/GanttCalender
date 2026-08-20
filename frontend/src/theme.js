import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: { main: '#567C83', dark: '#425F65', light: '#3AAEA9' },
    secondary: { main: '#A2D5AB' },
    background: { default: '#eceef2', paper: '#ffffff' },
  },
  typography: {
    fontFamily:
      '"Pretendard", "Malgun Gothic", "맑은 고딕", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h5: { fontWeight: 700, fontSize: '1.15rem' },
    h6: { fontWeight: 700 },
    subtitle1: { fontWeight: 600, fontSize: '0.9rem' },
    subtitle2: { fontWeight: 600, fontSize: '0.82rem' },
    body2: { fontSize: '0.84rem' },
    caption: { fontSize: '0.75rem' },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600, borderRadius: 10, fontSize: '0.84rem' },
        containedPrimary: {
          background: 'linear-gradient(135deg, #567C83 0%, #3AAEA9 100%)',
          '&:hover': { background: 'linear-gradient(135deg, #425F65 0%, #309B96 100%)' },
        },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: '1px solid #e2e5ea',
          boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
          transition: 'box-shadow 0.2s',
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: { borderRadius: 10, border: '1px solid #e2e5ea', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: { backgroundColor: '#f4f6f9' },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700, whiteSpace: 'nowrap',
          fontSize: '0.78rem', color: '#5a6474',
          borderBottom: '1px solid #e2e5ea',
          padding: '10px 14px',
        },
        body: { fontSize: '0.84rem', padding: '10px 14px' },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': { backgroundColor: '#f8f9fb' },
          '&:last-child td': { borderBottom: 0 },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, fontSize: '0.72rem', height: 22, borderRadius: 999 },
        sizeSmall: { height: 20, fontSize: '0.7rem' },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { boxShadow: '0 20px 60px rgba(0,0,0,0.16)', borderRadius: 16 },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: { borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: { borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', border: '1px solid #e8eaee', marginTop: 4 },
        list: { padding: '6px' },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: { borderRadius: 8, fontSize: '0.84rem', margin: '1px 0', padding: '7px 12px',
          '&:hover': { backgroundColor: 'rgba(58,174,169,0.08)' },
          '&.Mui-selected': { backgroundColor: 'rgba(58,174,169,0.12)', '&:hover': { backgroundColor: 'rgba(58,174,169,0.16)' } },
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: { root: { fontWeight: 700, fontSize: '1rem', paddingBottom: 8 } },
    },
    MuiDrawer: {
      styleOverrides: { paper: { boxShadow: 'none' } },
    },
    MuiAppBar: {
      styleOverrides: { root: { boxShadow: 'none' } },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: '#e2e5ea' } },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&.Mui-selected': { backgroundColor: 'rgba(58,174,169,0.1)', color: '#3AAEA9' },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          fontSize: '0.84rem',
          borderRadius: 10,
          backgroundColor: '#fff',
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#3AAEA9' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#3AAEA9', borderWidth: 1.5 },
        },
        notchedOutline: { borderColor: '#d5d9e0', transition: 'border-color 0.2s' },
      },
    },
    MuiSelect: {
      styleOverrides: {
        select: { borderRadius: 10 },
      },
    },
    MuiInputLabel: {
      styleOverrides: { root: { fontSize: '0.84rem' } },
    },
    MuiAlert: {
      styleOverrides: { root: { borderRadius: 10, fontSize: '0.84rem' } },
    },
    MuiLinearProgress: {
      styleOverrides: { root: { borderRadius: 99, height: 5 } },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: { fontSize: '0.8rem', textTransform: 'none', fontWeight: 600, borderRadius: '7px !important' },
      },
    },
    MuiPagination: {
      styleOverrides: { root: { '& .MuiPaginationItem-root': { borderRadius: 8 } } },
    },
  },
});

export default theme;
