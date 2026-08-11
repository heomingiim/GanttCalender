import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  TextField,
  Typography,
} from '@mui/material';

import { useAuth } from '../contexts/AuthContext';

/**
 * STEP 4 — 로그인.
 * 비밀번호 없이 사원번호만으로 인증하는 사내 데모 방식이다.
 * 성공하면 서버가 Set-Cookie로 JSESSIONID를 내려주고, 이후 요청에 자동으로 실린다.
 */
export default function LoginPage() {
  const { login, isLoggedIn, loading } = useAuth();
  const navigate = useNavigate();

  const [employeeNumber, setEmployeeNumber] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 세션 확인 중에는 판단을 미룬다 (섣불리 로그인 폼을 보여주면 깜빡인다)
  if (loading) {
    return (
      <Box sx={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }
  // 이미 로그인된 상태로 /login에 오면 홈으로 돌려보낸다
  if (isLoggedIn) return <Navigate to="/" replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const value = employeeNumber.trim();
    if (!value) {
      setError('사원번호를 입력하세요.');
      return;
    }

    setSubmitting(true);
    try {
      await login(value);
      navigate('/', { replace: true }); // replace: 뒤로가기로 로그인 화면에 못 돌아오게
    } catch (err) {
      // 서버가 준 한글 메시지("존재하지 않는 사원번호입니다.")를 그대로 노출
      setError(err?.message ?? '로그인에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Card sx={{ width: 380 }} elevation={3}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" color="primary" gutterBottom>
            두리안 그룹웨어
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            사원번호로 로그인하세요.
          </Typography>

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 2 }}>
            <TextField
              label="사원번호"
              placeholder="EMP0001"
              value={employeeNumber}
              onChange={(e) => setEmployeeNumber(e.target.value)}
              autoFocus
              fullWidth
            />

            {error && <Alert severity="error">{error}</Alert>}

            <Button type="submit" variant="contained" size="large" disabled={submitting}>
              {submitting ? '로그인 중…' : '로그인'}
            </Button>
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>
            employees.csv가 적재된 경우 EMP0001 형식, 기본 시드라면 EMP001 형식입니다.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
