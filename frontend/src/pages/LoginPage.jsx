import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  TextField,
  Typography,
} from '@mui/material';
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded';

import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login, isLoggedIn, loading } = useAuth();
  const navigate = useNavigate();

  const [employeeNumber, setEmployeeNumber] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }
  if (isLoggedIn) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const value = employeeNumber.trim();
    if (!value) { setError('사원번호를 입력하세요.'); return; }
    setSubmitting(true);
    try {
      await login(value);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err?.message ?? '로그인에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100%',
        display: 'flex',
        bgcolor: '#f5f6f8',
      }}
    >
      {/* 왼쪽 브랜드 패널 */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          width: 420,
          flexShrink: 0,
          background: 'linear-gradient(160deg, #425F65 0%, #3AAEA9 100%)',
          color: '#fff',
          p: 6,
          gap: 3,
        }}
      >
        <Box
          sx={{
            width: 64, height: 64,
            bgcolor: 'rgba(255,255,255,0.18)',
            borderRadius: 3,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <GridViewRoundedIcon sx={{ fontSize: 36, color: '#fff' }} />
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h4" fontWeight={800} sx={{ lineHeight: 1.2, mb: 1 }}>
            두리안
          </Typography>
          <Typography sx={{ fontSize: '0.9rem', opacity: 0.8, letterSpacing: 3 }}>
            GROUPWARE
          </Typography>
        </Box>
        <Typography
          sx={{ fontSize: '0.9rem', opacity: 0.7, textAlign: 'center', maxWidth: 280, lineHeight: 1.7, mt: 2 }}
        >
          일정, 프로젝트, 조직 관리를<br />한 곳에서 간편하게
        </Typography>
      </Box>

      {/* 오른쪽 로그인 폼 */}
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 3, md: 6 },
        }}
      >
        {/* 모바일용 로고 */}
        <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.5, mb: 4 }}>
          <Box
            sx={{
              width: 42, height: 42,
              background: 'linear-gradient(135deg, #425F65 0%, #3AAEA9 100%)',
              borderRadius: 2,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <GridViewRoundedIcon sx={{ color: '#fff', fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight={800} color="primary.dark" sx={{ lineHeight: 1 }}>두리안</Typography>
            <Typography variant="caption" color="text.secondary">GROUPWARE</Typography>
          </Box>
        </Box>

        <Box sx={{ width: '100%', maxWidth: 380 }}>
          <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5, color: 'text.primary' }}>
            로그인
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3.5 }}>
            사원번호를 입력하세요.
          </Typography>

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 2 }}>
            <TextField
              label="사원번호"
              placeholder="EMP0001"
              value={employeeNumber}
              onChange={(e) => setEmployeeNumber(e.target.value)}
              autoFocus
              fullWidth
              size="small"
              sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fff', borderRadius: 2 } }}
            />

            {error && <Alert severity="error" sx={{ py: 0.5 }}>{error}</Alert>}

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={submitting}
              sx={{
                mt: 0.5, py: 1.3, borderRadius: 2,
                background: 'linear-gradient(90deg, #425F65 0%, #3AAEA9 100%)',
                '&:hover': { background: 'linear-gradient(90deg, #37505A 0%, #309B96 100%)' },
              }}
            >
              {submitting ? '로그인 중…' : '로그인'}
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
