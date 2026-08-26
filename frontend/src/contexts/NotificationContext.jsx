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

const POLL_INTERVAL_MS = 5000;
const MAX_FAILURES = 3;
const RETRY_INTERVAL_MS = 60000;

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { isLoggedIn } = useAuth();

  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState([]);
  const [available, setAvailable] = useState(true);
  const failureCountRef = useRef(0);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notiApi.getUnreadCount();
      setUnreadCount(res?.count ?? 0);
      failureCountRef.current = 0;
      setAvailable(true);
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

  useEffect(() => {
    if (!isLoggedIn || !available) return;

    fetchUnreadCount().catch(() => {});

    const timerId = setInterval(() => {
      fetchUnreadCount().catch(() => {});
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timerId);
  }, [isLoggedIn, available, fetchUnreadCount]);

  useEffect(() => {
    if (!isLoggedIn || available) return;

    const timerId = setInterval(() => {
      fetchUnreadCount().catch(() => {});
    }, RETRY_INTERVAL_MS);

    return () => clearInterval(timerId);
  }, [isLoggedIn, available, fetchUnreadCount]);

  useEffect(() => {
    if (!isLoggedIn) {
      setUnreadCount(0);
      setItems([]);
      failureCountRef.current = 0;
      setAvailable(true);
    }
  }, [isLoggedIn]);

  const markAsRead = useCallback(async (id) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await notiApi.markAsRead(id);
    } catch {
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
