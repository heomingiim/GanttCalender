import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 개발: Vite(:5173)가 /api 요청을 Spring(:8080)으로 프록시한다.
//   → 브라우저 입장에서는 같은 출처라서 JSESSIONID 쿠키가 그냥 붙고, CORS 문제도 없다.
// 배포: `npm run build` 결과물이 backend/src/main/resources/static 으로 들어가
//   Spring이 직접 서빙한다. 이때도 API 경로는 똑같이 /api 라서 코드 수정이 필요 없다.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // frappe-gantt 1.2.x의 package.json "exports"에는 "." 항목만 있어서
      // 'frappe-gantt/dist/frappe-gantt.css' 같은 하위 경로 import가 차단된다.
      // (Missing "./dist/frappe-gantt.css" specifier 에러)
      // 별칭을 만들어 실제 파일 경로로 우회한다.
      'frappe-gantt-css': fileURLToPath(
        new URL('./node_modules/frappe-gantt/dist/frappe-gantt.css', import.meta.url)
      ),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: false, // Host 헤더를 유지해야 세션 쿠키 도메인이 어긋나지 않는다
      },
    },
  },
  build: {
    outDir: '../backend/src/main/resources/static',
    emptyOutDir: true,
  },
});
