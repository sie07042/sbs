import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './OAuthCallback.css';

/**
 * OAuthCallback 컴포넌트
 *
 * 소셜 로그인(카카오) 후 백엔드에서 리다이렉트되는 콜백을 처리하는 페이지입니다.
 *
 * 처리 과정:
 * 1. URL 쿼리 파라미터에서 status 확인 (success 또는 error)
 * 2. error가 있으면 에러 메시지 표시 후 로그인 페이지로 이동
 * 3. status가 success이면 /api/refresh API 호출하여 Access Token 발급
 * 4. 백엔드가 설정한 HTTP-only 쿠키(Refresh Token)를 사용하여 인증
 * 5. 성공 시 홈 페이지로 이동
 */
function OAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshAccessToken } = useAuth();

  // 로딩 상태와 에러 상태 관리
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    /**
     * handleCallback 함수
     *
     * OAuth 콜백을 처리하는 비동기 함수입니다.
     *
     * 처리 과정:
     * 1. URL에서 status와 error 파라미터 추출
     * 2. error가 있으면 에러 처리
     * 3. status가 success이면 refreshAccessToken() 호출
     * 4. 성공 시 홈으로 이동, 실패 시 로그인 페이지로 이동
     */
    const handleCallback = async () => {
      try {
        // URL 쿼리 파라미터에서 status와 error 추출
        const status = searchParams.get('status');
        const errorMessage = searchParams.get('error');

        // 디버깅: URL 파라미터 확인
        console.log('현재 URL:', window.location.href);
        console.log('status:', status);
        console.log('errorMessage:', errorMessage);
        console.log('모든 URL 파라미터:', Object.fromEntries(searchParams.entries()));

        // 에러가 있는 경우 (백엔드에서 로그인 실패 시)
        if (errorMessage) {
          console.error('카카오 로그인 실패:', decodeURIComponent(errorMessage));
          setError(decodeURIComponent(errorMessage));
          setIsLoading(false);
          // 3초 후 로그인 페이지로 리다이렉트
          setTimeout(() => {
            navigate('/login');
          }, 3000);
          return;
        }

        // status가 success인 경우 (로그인 성공)
        // 백엔드가 이미 HTTP-only 쿠키로 Refresh Token을 설정했습니다
        if (status === 'success') {
          try {
            // 백엔드가 설정한 Refresh Token 쿠키를 사용하여 Access Token 요청
            // refreshAccessToken 함수는 /api/refresh API를 호출합니다
            // withCredentials: true로 HTTP-only 쿠키(refreshToken)가 자동으로 전송됩니다
            await refreshAccessToken();

            // 로그인 성공 메시지 표시
            alert('카카오 로그인 성공!');

            // 홈 페이지로 이동
            navigate('/');
          } catch (error) {
            // 토큰 갱신 실패
            console.error('토큰 갱신 실패:', error);
            setError('로그인 처리 중 오류가 발생했습니다.');
            setIsLoading(false);
            // 3초 후 로그인 페이지로 리다이렉트
            setTimeout(() => {
              navigate('/login');
            }, 3000);
          }
        } else {
          // 예상치 못한 상태
          console.error('알 수 없는 콜백 상태:', status);
          setError('알 수 없는 오류가 발생했습니다.');
          setIsLoading(false);
          // 3초 후 로그인 페이지로 리다이렉트
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        }
      } catch (err) {
        // 예상치 못한 에러 처리
        console.error('OAuth 콜백 처리 에러:', err);
        setError('로그인 처리 중 오류가 발생했습니다.');
        setIsLoading(false);
        // 3초 후 로그인 페이지로 리다이렉트
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    };

    // OAuth 콜백 처리 함수 실행
    handleCallback();
  }, [searchParams, navigate, refreshAccessToken]); // 의존성 배열: 이 값들이 변경될 때만 useEffect 재실행

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
