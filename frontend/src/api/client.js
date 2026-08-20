import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'skip', // ngrok 무료 플랜 인터셉터 우회
  },
});

/** 401을 감지했을 때 AuthContext에 알리는 이벤트 이름 */
export const AUTH_EXPIRED_EVENT = 'auth:expired';

// /auth/me(상태 확인)·/auth/login(오타 에러 표시)은 401에서 리다이렉트 제외
const SKIP_AUTH_REDIRECT = ['/auth/me', '/auth/login'];

client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    const data = error.response?.data;
    const url = error.config?.url ?? '';

    const normalized = {
      status,
      code: data?.code ?? 'NETWORK_ERROR',
      message: data?.message ?? '서버에 연결할 수 없습니다.',
      original: error,
    };

    if (status === 401 && !SKIP_AUTH_REDIRECT.some((p) => url.startsWith(p))) {
      // 인터셉터에서 React 상태를 직접 못 바꾸므로 이벤트로 AuthContext에 위임
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
    }

    return Promise.reject(normalized);
  }
);

export default client;
