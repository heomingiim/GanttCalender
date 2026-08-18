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

// ─────────────────────────────────────────────────────────────
// 로그인 상태를 앱 전체에서 공유하는 Context.
//
// 세션 방식이라 토큰을 localStorage에 저장하지 않는다. 진짜 로그인 상태는
// 서버의 세션에만 있고, 프론트는 새로고침할 때마다 GET /api/auth/me 로 물어본다.
// (그래서 로딩 상태가 필요하다 — 물어보는 동안 로그인 페이지로 튕기면 안 되니까)
// ─────────────────────────────────────────────────────────────

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // 최초 /auth/me 확인 중

  // 앱이 처음 뜰 때 딱 한 번 세션 확인.
  // 의존성 배열이 []라서 마운트 시 1회만 실행된다. 여기에 user를 넣으면
  // setUser → 재실행 → setUser ... 무한 루프가 된다.
  useEffect(() => {
    let cancelled = false; // 언마운트 후 setState 방지용 플래그

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

  // axios 인터셉터가 401을 만나면 쏘는 이벤트를 받아 로그인 상태를 해제한다.
  // React 컴포넌트 밖(인터셉터)에서는 setUser를 직접 호출할 수 없어서 이벤트를 경유한다.
  useEffect(() => {
    const handleExpired = () => setUser(null);
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired);
    // cleanup을 빠뜨리면 리스너가 계속 쌓인다 (메모리 누수 + 중복 실행)
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
