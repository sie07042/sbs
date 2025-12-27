import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // 개발 서버 설정
  server: {
    // port: 개발 서버가 사용할 포트 번호를 명시적으로 지정
    // 백엔드 CORS 설정이 localhost:5173만 허용하므로 포트를 고정합니다.
    port: 5173,

    // proxy 설정: API 요청을 백엔드 서버로 전달
    // 프론트엔드(localhost:5173)에서 백엔드(localhost:9080)로 요청 시 CORS 문제 해결
    proxy: {
      // '/api'로 시작하는 모든 요청을 백엔드 서버로 프록시
      // 예: axios.post('/api/signup') → http://localhost:9080/signup
      '/api': {
        // target: 실제 API 서버의 주소
        // 모든 '/api' 요청이 이 주소로 전달됩니다
        target: 'http://localhost:9080',

        // changeOrigin: HTTP 요청의 Origin 헤더를 target 주소로 변경
        //
        // 동작 원리:
        // - false일 때: Origin: http://localhost:5173 (프론트엔드 주소)
        // - true일 때:  Origin: http://localhost:9080 (백엔드 주소)
        //
        // 왜 필요한가?
        // 백엔드 서버가 특정 도메인에서만 요청을 받도록 설정된 경우,
        // Origin 헤더가 백엔드 주소와 일치해야 요청을 처리합니다.
        // 가상 호스트(Virtual Host)를 사용하는 서버에서 특히 중요합니다.
        changeOrigin: true,

        // rewrite: 요청 경로를 변경하는 함수
        //
        // 동작 과정:
        // 1. 프론트엔드에서 요청: axios.post('/api/signup')
        // 2. rewrite 함수 실행: '/api/signup' → '/signup'
        // 3. 최종 요청 주소: http://localhost:9080/signup
        //
        // 정규표현식 설명:
        // - ^: 문자열의 시작을 의미
        // - \/api: '/api' 문자열과 정확히 일치
        // - replace(/^\/api/, ''): 문자열 시작 부분의 '/api'를 빈 문자열로 교체
        //
        // 예시:
        // - '/api/signup'  → '/signup'
        // - '/api/login'   → '/login'
        // - '/api/user/1'  → '/user/1'
        // - '/signup'      → '/signup' (변경 없음, '/api'로 시작하지 않으므로)
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
