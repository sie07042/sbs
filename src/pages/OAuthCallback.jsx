import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';
import './OAuthCallback.css';

/**
 * OAuthCallback 컴포넌트
 *
 * 📌 카카오 로그인의 마지막 단계를 처리하는 컴포넌트입니다.
 *
 * 이 컴포넌트가 실행되는 시점:
 * - 백엔드에서 http://localhost:5173/oauth/callback?status=success 로 리다이렉트한 직후
 * - 사용자는 카카오 로그인을 이미 완료한 상태
 * - 백엔드는 세션에 JWT 토큰들을 임시로 저장해둔 상태
 *
 * 📌 프론트엔드 관점의 카카오 로그인 플로우 (2단계):
 *
 * [1단계] 백엔드가 프론트엔드로 리다이렉트 (이전 단계에서 완료됨)
 *   - URL: http://localhost:5173/oauth/callback?status=success
 *   - 백엔드 세션에 JWT 토큰들이 임시 저장되어 있음
 *   ↓
 * [2단계] 이 컴포넌트(OAuthCallback)가 마운트되고 useEffect 실행
 *   - URL에서 status 파라미터 확인
 *   ↓
 * [3단계] status=success 확인 후 백엔드에 토큰 교환 요청
 *   - POST /api/auth/kakao/exchange-token 호출
 *   - withCredentials: true로 세션 쿠키 자동 전송
 *   ↓
 * [4단계] 백엔드가 세션에서 토큰을 꺼내서 응답
 *   - Refresh Token은 HTTP-only 쿠키로 설정 (브라우저가 자동 저장)
 *   - Access Token과 사용자 정보는 JSON 응답 바디로 반환
 *   ↓
 * [5단계] 응답 받은 데이터로 로그인 상태 저장
 *   - login(user, accessToken) 호출
 *   - AuthContext에 사용자 정보와 Access Token 저장
 *   - localStorage에 사용자 정보 저장 (UX 개선용)
 *   ↓
 * [6단계] 홈 페이지(/)로 이동
 *   - 로그인 완료!
 *
 * 보안 포인트:
 * - Refresh Token은 HTTP-only 쿠키에 저장되어 JavaScript로 접근 불가 (XSS 방어)
 * - Access Token은 메모리(React state)에만 저장
 * - 세션을 사용하여 토큰을 안전하게 전달
 *
 * 🔒 중복 실행 방지:
 * - React StrictMode는 development 환경에서 useEffect를 두 번 실행함
 * - 토큰 교환 API를 두 번 호출하면 두 번째는 세션이 이미 소진되어 401 에러 발생
 * - useRef를 사용하여 한 번만 실행되도록 보장
 */
function OAuthCallback() {
  // React Router의 페이지 이동 함수
  const navigate = useNavigate();

  // URL 쿼리 파라미터를 읽기 위한 hook
  // 예: ?status=success&error=... 에서 status와 error 값을 추출
  const [searchParams] = useSearchParams();

  // AuthContext에서 login 함수를 가져옴
  // login(user, accessToken) 형태로 호출하여 로그인 상태 저장
  const { login } = useAuth();

  // 로딩 상태: 토큰 교환 API 호출 중인지 여부
  const [isLoading, setIsLoading] = useState(true);

  // 에러 상태: 로그인 실패 시 에러 메시지 저장
  const [error, setError] = useState(null);

  // ========================================
  // 🔑 중요: 중복 실행 방지 플래그
  // ========================================
  // React StrictMode가 development 환경에서 useEffect를 두 번 실행하는 것을 방지
  // useRef는 컴포넌트가 리렌더링되어도 값이 유지됨
  const hasExecutedRef = useRef(false);

  useEffect(() => {
    // ========================================
    // 🔒 중복 실행 방지 체크
    // ========================================
    // 이미 실행된 적이 있다면 함수 종료
    if (hasExecutedRef.current) {
      console.log('이미 토큰 교환을 실행했으므로 중복 실행 방지');
      return;
    }

    // 실행 플래그를 true로 설정
    hasExecutedRef.current = true;
    /**
     * handleCallback 함수
     *
     * OAuth 콜백을 처리하는 비동기 함수입니다.
     * 컴포넌트가 마운트되면 자동으로 실행됩니다.
     */
    const handleCallback = async () => {
      try {
        // ========================================
        // 1️⃣ URL 파라미터 확인
        // ========================================
        // URL에서 쿼리 파라미터 추출
        // - status: 'success' 또는 null
        // - error: 에러 메시지 또는 null
        const status = searchParams.get('status');
        const errorMessage = searchParams.get('error');

        // 디버깅용 로그 출력
        console.log('=== 카카오 OAuth 콜백 처리 시작 ===');
        console.log('현재 URL:', window.location.href);
        console.log('status:', status);
        console.log('errorMessage:', errorMessage);

        // ========================================
        // 2️⃣ 에러 처리
        // ========================================
        // 백엔드에서 에러 파라미터와 함께 리다이렉트한 경우
        // 예: /oauth/callback?error=카카오%20로그인%20실패
        if (errorMessage) {
          console.error('카카오 로그인 실패:', decodeURIComponent(errorMessage));

          // 에러 메시지를 화면에 표시
          setError(decodeURIComponent(errorMessage));
          setIsLoading(false);

          // 3초 후 자동으로 로그인 페이지로 이동
          setTimeout(() => {
            navigate('/login');
          }, 3000);
          return; // 여기서 함수 종료
        }

        // ========================================
        // 3️⃣ 성공 처리 - 토큰 교환 요청
        // ========================================
        // status가 'success'인 경우 (카카오 로그인 성공)
        if (status === 'success') {
          try {
            console.log('카카오 로그인 성공 - 토큰 교환 API 호출 시작');

            // 백엔드에 토큰 교환 요청
            // POST /api/auth/kakao/exchange-token
            //
            // 🔑 중요한 점:
            // - Vite proxy가 '/api' → 'http://localhost:9080'으로 변환
            // - withCredentials: true 덕분에 브라우저가 세션 쿠키를 자동으로 전송
            // - 백엔드는 세션 쿠키로 사용자를 식별하고 세션에서 JWT 토큰을 꺼냄
            //
            // 백엔드가 하는 일:
            // 1. 세션에서 JWT 토큰들을 가져옴 (accessToken, refreshToken)
            // 2. Refresh Token을 HTTP-only 쿠키로 설정 (response.addCookie)
            // 3. Access Token과 사용자 정보를 JSON 응답으로 반환
            const response = await axios.post('/api/auth/kakao/exchange-token', {}, {
              withCredentials: true  // 🔒 필수! 세션 쿠키 전송 및 HTTP-only 쿠키 수신
            });

            console.log('토큰 교환 응답:', response.data);

            // ========================================
            // 4️⃣ 응답 처리 - 로그인 상태 저장
            // ========================================
            // 백엔드 응답 형식:
            // {
            //   success: true,
            //   message: "카카오 로그인 성공",
            //   data: {
            //     accessToken: "eyJhbGciOiJIUzUxMiJ9...",
            //     user: {
            //       id: 1,
            //       email: "user@example.com",
            //       name: "홍길동",
            //       role: "USER"
            //     }
            //   }
            // }
            if (response.data.success) {
              // 응답에서 Access Token과 사용자 정보 추출
              const { accessToken, user } = response.data.data;

              console.log('로그인 성공 - 사용자:', user.email);

              // ========================================
              // 5️⃣ AuthContext에 로그인 정보 저장
              // ========================================
              // login(user, accessToken) 함수가 하는 일:
              // 1. React State에 user와 accessToken 저장 (메모리)
              // 2. localStorage에 user 정보 저장 (페이지 새로고침 시 UX 개선용)
              //
              // 주의: accessToken은 localStorage에 저장하지 않음! (보안)
              // 페이지 새로고침 시 /api/refresh를 호출하여 새로 발급받음
              login(user, accessToken);

              // 사용자에게 성공 알림
              alert('카카오 로그인 성공!');

              // ========================================
              // 6️⃣ 홈 페이지로 이동
              // ========================================
              // 로그인 완료! 이제 사용자는 인증된 상태
              // - Refresh Token: HTTP-only 쿠키에 저장됨 (브라우저가 자동 관리)
              // - Access Token: React State에 저장됨 (API 요청 시 사용)
              // - User Info: React State + localStorage에 저장됨
              //
              // replace: true 옵션 사용 이유:
              // - 브라우저 히스토리에서 /oauth/callback 페이지를 제거
              // - 뒤로가기 버튼으로 콜백 페이지로 돌아가는 것 방지
              // - URL의 ?status=success 쿼리 파라미터 제거
              navigate('/', { replace: true });
            } else {
              // 백엔드가 success: false를 반환한 경우
              throw new Error(response.data.message || '토큰 교환 실패');
            }
          } catch (error) {
            // ========================================
            // ❌ 토큰 교환 API 호출 실패
            // ========================================
            // 가능한 원인:
            // - 세션 만료 (사용자가 너무 오래 기다림)
            // - 백엔드 에러 (500 Internal Server Error)
            // - 네트워크 에러
            console.error('토큰 교환 실패:', error);
            console.error('에러 상세:', error.response?.data);

            // 에러 메시지 표시
            setError('로그인 처리 중 오류가 발생했습니다.');
            setIsLoading(false);

            // 3초 후 로그인 페이지로 이동
            setTimeout(() => {
              navigate('/login');
            }, 3000);
          }
        } else {
          // ========================================
          // ❌ 예상치 못한 status 값
          // ========================================
          // status가 'success'도 아니고 error도 없는 경우
          // 정상적인 플로우에서는 발생하지 않아야 함
          console.error('알 수 없는 콜백 상태:', status);
          setError('알 수 없는 오류가 발생했습니다.');
          setIsLoading(false);

          // 3초 후 로그인 페이지로 이동
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        }
      } catch (err) {
        // ========================================
        // ❌ 예상치 못한 에러 처리
        // ========================================
        // JavaScript 런타임 에러 등
        console.error('OAuth 콜백 처리 에러:', err);
        setError('로그인 처리 중 오류가 발생했습니다.');
        setIsLoading(false);

        // 3초 후 로그인 페이지로 이동
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    };

    // ========================================
    // useEffect 실행
    // ========================================
    // 컴포넌트가 마운트되면 handleCallback 함수를 즉시 실행
    // 사용자는 "로그인 처리 중..." 화면을 보게 됨
    handleCallback();
  }, [searchParams, navigate, login]); // 의존성 배열: 이 값들이 변경될 때만 useEffect 재실행

  return (
    <div className="oauth-callback-container">
      <div className="oauth-callback-card">
        {isLoading ? (
          // 로딩 중일 때 표시
          <>
            <div className="spinner"></div>
            <h2>로그인 처리 중...</h2>
            <p>잠시만 기다려주세요.</p>
          </>
        ) : (
          // 에러가 있을 때 표시
          <>
            <div className="error-icon">⚠️</div>
            <h2>로그인 실패</h2>
            <p>{error}</p>
            <p className="redirect-message">로그인 페이지로 이동합니다...</p>
          </>
        )}
      </div>
    </div>
  );
}

export default OAuthCallback;
