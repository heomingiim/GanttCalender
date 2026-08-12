import axios from 'axios';

// ─────────────────────────────────────────────────────────────
// axios 인스턴스: 모든 API 호출이 여기를 통과한다.
//
//  baseURL '/api'  → dev에서는 Vite 프록시가 :8080으로 넘기고,
//                    배포(단일 JAR)에서는 같은 서버의 /api로 그냥 간다. 코드 동일.
//  withCredentials → 세션 로그인이라 JSESSIONID 쿠키를 매 요청에 실어야 한다.
//                    이게 빠지면 로그인은 되는데 그 다음 요청이 전부 401이 된다.
// ─────────────────────────────────────────────────────────────
const client = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

/** 401을 감지했을 때 AuthContext에 알리는 이벤트 이름 */
export const AUTH_EXPIRED_EVENT = 'auth:expired';

// 401이 떠도 리다이렉트를 하면 안 되는 경로들.
// - /auth/me 는 "로그인 상태 확인"이 목적이라 401이 정상 응답에 가깝다.
// - /auth/login 은 사원번호 오타 시 자체 에러 메시지를 보여줘야 한다.
const SKIP_AUTH_REDIRECT = ['/auth/me', '/auth/login'];

// ─── 서버에 아직 없는 엔드포인트 ──────────────────────────────
//
// 화면을 서버보다 먼저 만들 때, 여기에 경로를 적어두면 에러 토스트 대신
// "백엔드 준비 중" 안내(NotReadyNotice)가 뜬다. 구현하면 다시 지운다.
//
// 응답만 보고 자동 판별할 수는 없다. GlobalExceptionHandler가
// @ExceptionHandler(Exception.class)로 매핑 없는 경로의 예외까지 잡아
// 500 INTERNAL_ERROR로 덮어버려서, 미구현인지 진짜 서버 버그인지 구분되지 않는다.
//
// 지금은 모든 API가 구현되어 비어 있다.
const NOT_IMPLEMENTED = [];

client.interceptors.response.use(
  // 성공: 매번 res.data를 꺼내 쓰기 번거로우니 여기서 벗겨서 넘긴다.
  (response) => response.data,

  // 실패: 서버가 주는 { code, message } 규격을 하나의 형태로 정규화한다.
  (error) => {
    const status = error.response?.status;
    const data = error.response?.data;
    const url = error.config?.url ?? '';

    // NOT_IMPLEMENTED에 적힌 경로가 404/500으로 실패하면 미구현으로 본다.
    // (BusinessException으로 내려오는 4xx는 정상적으로 처리된 에러이므로 제외)
    const notReady =
      (status === 404 || status === 500) && NOT_IMPLEMENTED.some((re) => re.test(url));

    const normalized = {
      status,
      code: notReady ? 'NOT_IMPLEMENTED' : (data?.code ?? 'NETWORK_ERROR'),
      message: notReady
        ? '아직 구현되지 않은 API입니다.'
        : (data?.message ?? '서버에 연결할 수 없습니다.'),
      notReady,
      original: error,
    };

    if (status === 401 && !SKIP_AUTH_REDIRECT.some((p) => url.startsWith(p))) {
      // 세션 만료. React 밖(인터셉터)에서 상태를 직접 못 바꾸므로
      // 커스텀 이벤트를 쏘고 AuthContext가 받아서 처리한다.
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
    }

    return Promise.reject(normalized);
  }
);

export default client;
