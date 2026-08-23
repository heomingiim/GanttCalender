import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as notiApi from '../api/notifications';
import { useAuth } from './AuthContext';

// ─────────────────────────────────────────────────────────────
// 알림 폴링
//
// 5초마다 GET /api/notifications/unread-count 를 호출해 뱃지를 갱신한다.
//
// 폴링에서 반드시 지켜야 할 3가지:
//  1) 로그인 상태에서만 돈다        → 로그아웃하면 401이 5초마다 쏟아진다
//  2) cleanup에서 clearInterval    → 안 하면 타이머가 중첩되어 호출이 배로 늘어난다
//  3) 실패가 반복되면 스스로 멈춘다 → 3회 연속 실패하면 폴링을 끄고 UI에 안내를 띄운다.
// ─────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 5000;
const MAX_FAILURES = 3;
// 폴링이 꺼진 뒤의 재시도 주기. 5초 폴링을 계속 돌릴 수는 없지만,
// 일시적인 장애였다면 새로고침 없이도 스스로 복구되어야 한다.
const RETRY_INTERVAL_MS = 60000;

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { isLoggedIn } = useAuth();

  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState([]);
  const [available, setAvailable] = useState(true); // 백엔드가 준비됐는지

  // 실패 횟수는 "화면에 그릴 값"이 아니라 "기억만 해두는 값"이라 useRef를 쓴다.
  // useState로 하면 값이 바뀔 때마다 리렌더 → useEffect 재실행 → 타이머 재생성이 된다.
  const failureCountRef = useRef(0);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notiApi.getUnreadCount();
      setUnreadCount(res?.count ?? 0);
      failureCountRef.current = 0; // 성공하면 카운터 리셋
      setAvailable(true); // 복구되면 5초 폴링을 다시 켠다
    } catch (err) {
      failureCountRef.current += 1;
      if (failureCountRef.current >= MAX_FAILURES) {
        setAvailable(false); // 폴링 중단 신호
      }
      throw err;
    }
  }, []);

  const fetchList = useCallback(async () => {
    try {
      const list = await notiApi.listNotifications();
      setItems(Array.isArray(list) ? list : []);
      setAvailable(true);
    } catch {
      setItems([]);
    }
  }, []);

  // 폴링 타이머. isLoggedIn / available이 바뀔 때마다 정리 후 새로 건다.
  useEffect(() => {
    if (!isLoggedIn || !available) return; // 조건 미충족이면 타이머 자체를 안 만든다

    // 로그인 직후 즉시 1회 (5초를 기다리게 하면 뱃지가 늦게 뜬다)
    fetchUnreadCount().catch(() => {});

    const timerId = setInterval(() => {
      fetchUnreadCount().catch(() => {});
    }, POLL_INTERVAL_MS);

    // ★ cleanup ★ 컴포넌트가 사라지거나 의존성이 바뀔 때 반드시 타이머를 없앤다
    return () => clearInterval(timerId);
  }, [isLoggedIn, available, fetchUnreadCount]);

  // 폴링이 꺼진 뒤의 저속 재시도.
  // 이게 없으면 잠깐의 네트워크 장애로 뱃지가 영구히 멈춘다.
  useEffect(() => {
    if (!isLoggedIn || available) return;

    const timerId = setInterval(() => {
      // 성공하면 fetchUnreadCount가 available을 true로 돌리고,
      // 위의 5초 폴링 effect가 다시 살아난다.
      fetchUnreadCount().catch(() => {});
    }, RETRY_INTERVAL_MS);

    return () => clearInterval(timerId);
  }, [isLoggedIn, available, fetchUnreadCount]);

  // 로그아웃하면 남아있던 뱃지 숫자를 지운다
  useEffect(() => {
    if (!isLoggedIn) {
      setUnreadCount(0);
      setItems([]);
      failureCountRef.current = 0;
      setAvailable(true); // 다음 로그인은 깨끗한 상태에서 시작해야 한다
    }
  }, [isLoggedIn]);

  const markAsRead = useCallback(async (id) => {
    // 낙관적 업데이트: 서버 응답을 기다리지 않고 화면부터 바꾼다
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await notiApi.markAsRead(id);
    } catch {
      // 실패하면 서버 기준으로 되돌린다
      await fetchList();
    }
  }, [fetchList]);

  const markAllAsRead = useCallback(async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await notiApi.markAllAsRead();
    } catch {
      await fetchList();
    }
  }, [fetchList]);

  const remove = useCallback(async (id) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    try {
      await notiApi.deleteNotification(id);
    } catch {
      await fetchList();
    }
  }, [fetchList]);

  const removeAll = useCallback(async () => {
    setItems([]);
    setUnreadCount(0);
    try {
      await notiApi.deleteAllNotifications();
    } catch {
      await fetchList();
    }
  }, [fetchList]);

  const value = useMemo(
    () => ({ unreadCount, items, available, fetchList, markAsRead, markAllAsRead, remove, removeAll }),
    [unreadCount, items, available, fetchList, markAsRead, markAllAsRead, remove, removeAll]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications는 <NotificationProvider> 안에서만 쓸 수 있습니다.');
  }
  return ctx;
}
