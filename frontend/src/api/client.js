import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'skip', // ngrok 무료 플랜 인터셉터 우회
  },
});

export const AUTH_EXPIRED_EVENT = 'auth:expired';

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
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
    }

    return Promise.reject(normalized);
  }
);

export default client;
