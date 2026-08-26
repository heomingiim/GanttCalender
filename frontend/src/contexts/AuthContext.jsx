import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as authApi from '../api/auth';
import { AUTH_EXPIRED_EVENT } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // 최초 /auth/me 확인 중

  useEffect(() => {
    let cancelled = false;

    authApi
      .getMe()
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {
        if (!cancelled) setUser(null); // 401 = 아직 로그인 안 함. 정상 흐름.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleExpired = () => setUser(null);
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired);
  }, []);

  const login = useCallback(async (employeeNumber) => {
    const me = await authApi.login(employeeNumber);
    setUser(me);
    return me;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      // 서버 호출이 실패해도 화면상으로는 로그아웃시킨다
      setUser(null);
    }
  }, []);

  // ToastContext와 같은 이유로 메모이제이션한다 (불필요한 리렌더·재조회 방지)
  const value = useMemo(
    () => ({ user, loading, login, logout, isLoggedIn: user != null }),
    [user, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth는 <AuthProvider> 안에서만 쓸 수 있습니다.');
  return ctx;
}
